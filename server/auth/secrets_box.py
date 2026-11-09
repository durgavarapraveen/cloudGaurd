"""
Encryption for cloud-account credentials at rest.

Cloud credentials (AWS access keys, Azure client secrets, GCP service-account
JSON) are stored in the `cloud_accounts.credentials` column. Anyone with read
access to the database would otherwise obtain usable production credentials, so
the value is encrypted with Fernet (AES-128-CBC + HMAC-SHA256) before it is
written and decrypted only when a scan needs it.

Key management
--------------
Set CREDENTIALS_ENCRYPTION_KEY to a urlsafe-base64 32-byte key:

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

Rotation: put the new key first in a comma-separated list and keep the old one
after it. New writes use the first key; reads try every key in order.

    CREDENTIALS_ENCRYPTION_KEY=<new-key>,<old-key>

Losing every key makes stored credentials unrecoverable; the affected cloud
accounts must then be re-linked.
"""

import json
import logging
import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

logger = logging.getLogger(__name__)

# Marks an encrypted envelope so plaintext rows written before encryption was
# introduced are still readable.
ENVELOPE_KEY = "__enc__"
ENVELOPE_VERSION = 1


class CredentialsEncryptionError(RuntimeError):
    """Raised when credentials cannot be encrypted or decrypted."""


def _load_keys() -> list[str]:
    raw = os.getenv("CREDENTIALS_ENCRYPTION_KEY", "")

    return [key.strip() for key in raw.split(",") if key.strip()]


def encryption_configured() -> bool:
    return bool(_load_keys())


def _fernets() -> list[Fernet]:
    keys = _load_keys()

    if not keys:
        raise CredentialsEncryptionError(
            "CREDENTIALS_ENCRYPTION_KEY is not set. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )

    try:
        return [Fernet(key.encode()) for key in keys]
    except (ValueError, TypeError) as exc:
        raise CredentialsEncryptionError(
            "CREDENTIALS_ENCRYPTION_KEY is not a valid Fernet key"
        ) from exc


def encrypt_credentials(credentials: dict) -> dict:
    """Return an encrypted envelope for a credentials mapping."""
    if not isinstance(credentials, dict):
        raise CredentialsEncryptionError("Credentials must be a mapping")

    token = _fernets()[0].encrypt(
        json.dumps(credentials, separators=(",", ":")).encode()
    )

    return {
        ENVELOPE_KEY: ENVELOPE_VERSION,
        "ciphertext": token.decode(),
    }


def is_encrypted(stored: dict | None) -> bool:
    return isinstance(stored, dict) and ENVELOPE_KEY in stored


def decrypt_credentials(stored: dict | None) -> dict:
    """
    Return the plaintext credentials for a stored value.

    A row written before encryption was introduced is returned as it is, so
    existing cloud accounts keep working; re-saving the account upgrades it.
    """
    if not stored:
        return {}

    if not is_encrypted(stored):
        logger.warning(
            "Cloud credentials are stored unencrypted. Re-save the cloud "
            "account to encrypt them at rest."
        )
        return stored

    ciphertext = str(stored.get("ciphertext", "")).encode()

    for fernet in _fernets():
        try:
            return json.loads(fernet.decrypt(ciphertext))
        except InvalidToken:
            continue

    raise CredentialsEncryptionError(
        "Stored credentials could not be decrypted with any configured key"
    )
