import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)


def generate_temp_password(length: int = 16) -> str:
    """
    Return a printable, URL-safe random password.

    Used for accounts created by an operator. The value is emailed to the new
    user once and never stored in plain text.
    """
    if length < 12:
        raise ValueError("Temporary passwords must be at least 12 characters")

    # token_urlsafe returns about 1.3 characters per byte; slice to the
    # requested length so the result is predictable.
    return secrets.token_urlsafe(length)[:length]


def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)