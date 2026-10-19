import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest

from app import crypto
from app.config import get_settings


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_encrypt_decrypt_roundtrip(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key")
    get_settings.cache_clear()

    ciphertext, iv, tag = crypto.encrypt_credential("ghp_super_secret_token")

    assert ciphertext
    assert iv
    assert tag
    assert crypto.decrypt_credential(ciphertext, iv, tag) == "ghp_super_secret_token"


def test_ciphertext_does_not_contain_plaintext(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key")
    get_settings.cache_clear()

    ciphertext, _iv, _tag = crypto.encrypt_credential("ghp_super_secret_token")

    assert "ghp_super_secret_token" not in ciphertext


def test_decrypt_fails_when_tag_is_tampered(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "test-encryption-key")
    get_settings.cache_clear()

    ciphertext, iv, tag = crypto.encrypt_credential("ghp_super_secret_token")
    tampered_tag = ("A" if tag[0] != "A" else "B") + tag[1:]

    with pytest.raises(Exception):
        crypto.decrypt_credential(ciphertext, iv, tampered_tag)


def test_decrypt_fails_with_wrong_key(monkeypatch):
    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "key-one")
    get_settings.cache_clear()
    ciphertext, iv, tag = crypto.encrypt_credential("ghp_super_secret_token")

    monkeypatch.setenv("CREDENTIAL_ENCRYPTION_KEY", "key-two")
    get_settings.cache_clear()

    with pytest.raises(Exception):
        crypto.decrypt_credential(ciphertext, iv, tag)


def test_encrypt_raises_without_any_configured_key(monkeypatch):
    monkeypatch.setattr(crypto, "get_settings", lambda: type("S", (), {"credential_encryption_key": None, "changethis_secret_key": None})())

    with pytest.raises(RuntimeError):
        crypto.encrypt_credential("value")
