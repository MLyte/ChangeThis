import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import get_settings

_TAG_LENGTH = 16


def _encryption_key() -> bytes:
    settings = get_settings()
    secret = settings.credential_encryption_key or settings.changethis_secret_key

    if not secret:
        raise RuntimeError("CREDENTIAL_ENCRYPTION_KEY is required to store provider credentials")

    return hashlib.sha256(secret.encode("utf-8")).digest()


def encrypt_credential(plaintext: str) -> tuple[str, str, str]:
    key = _encryption_key()
    iv = os.urandom(12)
    ciphertext_with_tag = AESGCM(key).encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext, tag = ciphertext_with_tag[:-_TAG_LENGTH], ciphertext_with_tag[-_TAG_LENGTH:]

    return (
        base64.urlsafe_b64encode(ciphertext).decode("ascii"),
        base64.urlsafe_b64encode(iv).decode("ascii"),
        base64.urlsafe_b64encode(tag).decode("ascii"),
    )


def decrypt_credential(ciphertext_b64: str, iv_b64: str, tag_b64: str) -> str:
    key = _encryption_key()
    iv = base64.urlsafe_b64decode(iv_b64)
    ciphertext = base64.urlsafe_b64decode(ciphertext_b64)
    tag = base64.urlsafe_b64decode(tag_b64)
    plaintext = AESGCM(key).decrypt(iv, ciphertext + tag, None)

    return plaintext.decode("utf-8")
