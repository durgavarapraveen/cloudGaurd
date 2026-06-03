import os
import hmac
import hashlib
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / "server" / ".env")
load_dotenv(ROOT_DIR / "infra" / ".env")

def verify_signature(payload_bytes: bytes, signature_header: str) -> bool:
    """
    GitHub signs every webhook with HMAC-SHA256.
    Always verify — never skip this in production.
    """
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "githubwebhooksecret")
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = hmac.new(
        secret.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    received = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, received)