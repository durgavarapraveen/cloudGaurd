"""
Regression tests for the security invariants fixed in the v0.1 hardening pass.

These are unit tests: they exercise the tenant-binding dependency, the
credential encryption helpers, the temporary-password generator and the
response models directly, with no database or network. Run them with:

    cd server && python -m pytest
"""

import os
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("JWT_SECRET_KEY", "test-only-key-that-is-long-enough-1234567890")

# Importing main pulls in the database module, which requires a DSN. Nothing
# in these tests connects, so a credential-free URL is enough.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost/cloudguard_test")

from auth.password import (  # noqa: E402
    generate_temp_password,
    hash_password,
    verify_password,
)
from cryptography.fernet import Fernet  # noqa: E402

from auth.secrets_box import (  # noqa: E402
    CredentialsEncryptionError,
    decrypt_credentials,
    encrypt_credentials,
    is_encrypted,
)


# ──────────────────────────────────────────────────────────────
#  Temporary passwords
# ──────────────────────────────────────────────────────────────


def test_temp_password_is_not_the_old_hardcoded_default():
    assert generate_temp_password() != "12345678"


def test_temp_password_is_printable_and_long_enough():
    password = generate_temp_password()

    assert len(password) == 16
    assert password.isprintable()
    assert password.isascii()


def test_temp_passwords_are_unique():
    assert len({generate_temp_password() for _ in range(500)}) == 500


def test_temp_password_round_trips_through_hashing():
    password = generate_temp_password()

    assert verify_password(password, hash_password(password))


def test_temp_password_rejects_a_weak_length():
    with pytest.raises(ValueError):
        generate_temp_password(length=8)


# ──────────────────────────────────────────────────────────────
#  Credential encryption
# ──────────────────────────────────────────────────────────────


# Generated per run rather than hardcoded: a committed Fernet key is
# indistinguishable from a real leaked one to a secret scanner, and a public
# repository should contain no key-shaped literals at all.
FERNET_TEST_KEY = Fernet.generate_key().decode()
SECOND_TEST_KEY = Fernet.generate_key().decode()


@pytest.fixture
def encryption_key(monkeypatch):
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", FERNET_TEST_KEY)


def test_credentials_round_trip(encryption_key):
    secret = {
        "access_key_id": "AKIA-EXAMPLE-NOT-A-REAL-KEY",
        "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    }

    stored = encrypt_credentials(secret)

    assert decrypt_credentials(stored) == secret


def test_stored_value_does_not_contain_the_plaintext(encryption_key):
    secret = {"secret_access_key": "wJalrXUtnFEMI-super-secret"}

    stored = encrypt_credentials(secret)

    assert "wJalrXUtnFEMI-super-secret" not in str(stored)
    assert is_encrypted(stored)


def test_encryption_is_randomised(encryption_key):
    secret = {"access_key_id": "AKIA-EXAMPLE-NOT-A-REAL-KEY"}

    first = encrypt_credentials(secret)["ciphertext"]
    second = encrypt_credentials(secret)["ciphertext"]

    assert first != second


def test_plaintext_rows_written_before_encryption_still_read(encryption_key):
    legacy = {"access_key_id": "AKIA...", "secret_access_key": "..."}

    assert decrypt_credentials(legacy) == legacy


def test_key_rotation_reads_values_written_with_the_old_key(monkeypatch):
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", FERNET_TEST_KEY)
    stored = encrypt_credentials({"access_key_id": "AKIA-old"})

    # New key first, previous key kept for reads.
    monkeypatch.setenv(
        "CREDENTIALS_ENCRYPTION_KEY", f"{SECOND_TEST_KEY},{FERNET_TEST_KEY}"
    )

    assert decrypt_credentials(stored) == {"access_key_id": "AKIA-old"}


def test_missing_key_is_an_explicit_error(monkeypatch):
    monkeypatch.delenv("CREDENTIALS_ENCRYPTION_KEY", raising=False)

    with pytest.raises(CredentialsEncryptionError):
        encrypt_credentials({"access_key_id": "AKIA..."})


def test_undecryptable_value_is_an_explicit_error(monkeypatch):
    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", FERNET_TEST_KEY)
    stored = encrypt_credentials({"access_key_id": "AKIA-old"})

    monkeypatch.setenv("CREDENTIALS_ENCRYPTION_KEY", SECOND_TEST_KEY)

    with pytest.raises(CredentialsEncryptionError):
        decrypt_credentials(stored)


# ──────────────────────────────────────────────────────────────
#  Tenant isolation
# ──────────────────────────────────────────────────────────────


class FakeState:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


class FakeRequest:
    def __init__(self, **kwargs):
        self.state = FakeState(**kwargs)


@pytest.fixture
def tenant_module(monkeypatch):
    """Import the dependency with its slug lookup stubbed out."""
    from middlewares import userPermissions

    monkeypatch.setattr(userPermissions.organization_Id, "clear", lambda: None)
    userPermissions.organization_Id.clear()

    return userPermissions


ORG_A = uuid.uuid4()
ORG_B = uuid.uuid4()


async def _resolve(module, monkeypatch, *, token_org, slug, slug_org, privilege="user"):
    async def fake_lookup(db, value):
        return slug_org

    monkeypatch.setattr(module, "getOrgIDfromSlug", fake_lookup)
    module.organization_Id.clear()

    request = FakeRequest(
        privilege=privilege,
        organizationId=token_org,
        slug=slug,
        user_id=str(uuid.uuid4()),
    )

    return await module.resolve_tenant(request, db=None), request


@pytest.mark.asyncio
async def test_slug_matching_the_token_is_accepted(tenant_module, monkeypatch):
    resolved, request = await _resolve(
        tenant_module, monkeypatch, token_org=ORG_A, slug="acme", slug_org=ORG_A
    )

    assert resolved == ORG_A
    assert request.state.organizationId == ORG_A


@pytest.mark.asyncio
async def test_slug_for_another_tenant_is_rejected(tenant_module, monkeypatch):
    """The header must never be able to switch organizations."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as caught:
        await _resolve(
            tenant_module,
            monkeypatch,
            token_org=ORG_A,
            slug="globex",
            slug_org=ORG_B,
        )

    assert caught.value.status_code == 403
    assert caught.value.detail == "Organization mismatch"


@pytest.mark.asyncio
async def test_token_without_an_organization_is_rejected(tenant_module, monkeypatch):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as caught:
        await _resolve(
            tenant_module, monkeypatch, token_org=None, slug="acme", slug_org=ORG_A
        )

    assert caught.value.status_code == 403


@pytest.mark.asyncio
async def test_no_slug_falls_back_to_the_token_organization(tenant_module, monkeypatch):
    resolved, _ = await _resolve(
        tenant_module, monkeypatch, token_org=ORG_A, slug=None, slug_org=None
    )

    assert resolved == ORG_A


@pytest.mark.asyncio
async def test_localhost_slug_is_ignored(tenant_module, monkeypatch):
    resolved, _ = await _resolve(
        tenant_module,
        monkeypatch,
        token_org=ORG_A,
        slug="localhost",
        slug_org=ORG_B,
    )

    assert resolved == ORG_A


@pytest.mark.asyncio
async def test_root_operator_may_use_a_slug_for_context(tenant_module, monkeypatch):
    resolved, _ = await _resolve(
        tenant_module,
        monkeypatch,
        token_org=None,
        slug="acme",
        slug_org=ORG_A,
        privilege="rootUser",
    )

    assert resolved == ORG_A


# ──────────────────────────────────────────────────────────────
#  Response models must not expose password hashes
# ──────────────────────────────────────────────────────────────


def test_user_response_model_has_no_password_field():
    from schemas.user_schema import RootUserPublic, UserPublic

    assert "password" not in UserPublic.model_fields
    assert "password" not in RootUserPublic.model_fields


def test_user_response_model_drops_a_password_attribute():
    from schemas.user_schema import UserPublic

    class Row:
        id = uuid.uuid4()
        username = "alice"
        email = "alice@example.com"
        is_active = True
        organization_id = ORG_A
        created_at = None
        password = "$argon2id$v=19$m=65536,t=3,p=4$abc$def"

    dumped = UserPublic.model_validate(Row()).model_dump()

    assert "password" not in dumped
    assert dumped["username"] == "alice"


# ──────────────────────────────────────────────────────────────
#  CORS must cover tenant subdomains but nothing else
# ──────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "origin,allowed",
    [
        ("http://localhost:3000", True),
        ("http://acme.localhost:3000", True),
        ("https://acme.localhost", True),
        ("http://127.0.0.1:3000", True),
        ("http://evil.com", False),
        ("http://localhost.evil.com", False),
        ("http://acme.localhost.evil.com", False),
    ],
)
def test_cors_origin_regex(origin, allowed):
    import re

    import main

    # The default must not be overridden by an empty environment variable:
    # an empty pattern matches every origin.
    assert main.CORS_ORIGIN_REGEX, "CORS regex must never be empty"

    assert bool(re.match(main.CORS_ORIGIN_REGEX, origin)) is allowed


# ──────────────────────────────────────────────────────────────
#  Startup configuration guard
# ──────────────────────────────────────────────────────────────


def test_startup_rejects_an_empty_jwt_secret(monkeypatch):
    import main

    monkeypatch.setenv("JWT_SECRET_KEY", "")

    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        main._validate_configuration()


def test_startup_rejects_a_short_jwt_secret(monkeypatch):
    import main

    monkeypatch.setenv("JWT_SECRET_KEY", "short")

    with pytest.raises(RuntimeError, match="too short"):
        main._validate_configuration()


def test_startup_accepts_a_strong_jwt_secret(monkeypatch):
    import main

    monkeypatch.setenv("JWT_SECRET_KEY", "x" * 48)

    main._validate_configuration()


def test_startup_requires_a_database_url(monkeypatch):
    import main

    monkeypatch.setenv("JWT_SECRET_KEY", "x" * 48)
    monkeypatch.setenv("DATABASE_URL", "")

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        main._validate_configuration()
