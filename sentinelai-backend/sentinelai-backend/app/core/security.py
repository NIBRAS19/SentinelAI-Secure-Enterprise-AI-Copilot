"""
Core auth primitives: password hashing and JWT issuance/decoding.

Password hashing uses stdlib `hashlib.scrypt` rather than passlib+bcrypt.
bcrypt 4.x removed the `__about__.__version__` attribute that older
passlib releases probe for at import time, causing a loud warning (and on
some pinned combinations, a hard failure) the moment this module loads.
scrypt is a well-studied, memory-hard KDF built into the standard library,
so this sidesteps the whole dependency-compatibility problem.
"""
import hashlib
import hmac
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt

from app.core.config import get_settings

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64


def hash_password(password: str) -> str:
    """Return `scrypt$<n>$<r>$<p>$<salt_hex>$<hash_hex>`."""
    salt = os.urandom(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=_SCRYPT_DKLEN
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${derived.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        scheme, n, r, p, salt_hex, hash_hex = hashed_password.split("$")
        if scheme != "scrypt":
            return False
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        derived = hashlib.scrypt(
            plain_password.encode("utf-8"), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected)
        )
        return hmac.compare_digest(derived, expected)
    except (ValueError, AttributeError):
        return False


class TokenError(Exception):
    """Raised for any invalid, expired, or malformed JWT."""


def _encode(claims: dict) -> str:
    settings = get_settings()
    return jwt.encode(claims, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc)) from exc


def create_access_token(member_id: str, extra_claims: Optional[dict[str, Any]] = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    claims = {
        "sub": member_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra_claims:
        claims.update(extra_claims)
    return _encode(claims)


def create_refresh_token(member_id: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    claims = {
        "sub": member_id,
        "type": "refresh",
        "jti": uuid.uuid4().hex,  # guarantees uniqueness even for tokens minted in the same second
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
    }
    return _encode(claims)


def create_password_reset_token(user_id: str, fingerprint: str, expires_minutes: int = 30) -> str:
    """
    `fingerprint` is derived from the user's CURRENT password hash (see
    auth_service.request_password_reset). Embedding it as a claim makes the
    token single-use without a separate token table: once the password
    changes, the fingerprint recorded in any outstanding token no longer
    matches, so `reset_password` rejects it.
    """
    now = datetime.now(timezone.utc)
    claims = {
        "sub": user_id,
        "type": "password_reset",
        "fp": fingerprint,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return _encode(claims)


def hash_token(token: str) -> str:
    """SHA-256 digest used when storing refresh-token identifiers for revocation checks."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def fingerprint_password_hash(password_hash: str) -> str:
    """Short, non-reversible fingerprint of a password hash, used in reset tokens."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:32]
