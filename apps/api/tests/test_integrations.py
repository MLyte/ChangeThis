from datetime import UTC, datetime
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException

from app import crypto
from app.models import ProviderCredential, ProviderIntegration
from app.routers import integrations
from app.schemas import (
    CredentialSaveRequest,
    ProviderIntegrationEnsureRequest,
    ProviderIntegrationStatusUpdateRequest,
)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None

    def scalars(self):
        return self

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.added = []
        self.deleted = []
        self.committed = False

    async def execute(self, _statement):
        if self.results:
            return self.results.pop(0)
        return FakeResult([])

    def add(self, item):
        self.added.append(item)

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        if getattr(item, "id", None) is None:
            item.id = uuid4()

    async def delete(self, item):
        self.deleted.append(item)


def make_integration(**overrides) -> ProviderIntegration:
    defaults = dict(
        id=uuid4(),
        workspace_id=uuid4(),
        provider="github",
        auth_type="personal_token",
        external_account_id=None,
        installation_id=None,
        base_url=None,
        status="needs_setup",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return ProviderIntegration(**defaults)


@pytest.mark.asyncio
async def test_ensure_integration_creates_row_when_missing():
    workspace_id = uuid4()
    db = FakeDb(results=[FakeResult([])])

    result = await integrations.ensure_integration(
        "github", ProviderIntegrationEnsureRequest(workspace_id=workspace_id), db=db
    )

    created = db.added[0]
    assert created.workspace_id == workspace_id
    assert created.provider == "github"
    assert created.status == "needs_setup"
    assert result.provider == "github"
    assert db.committed is True


@pytest.mark.asyncio
async def test_ensure_integration_is_idempotent_and_returns_existing_row():
    workspace_id = uuid4()
    existing = make_integration(workspace_id=workspace_id, status="connected")
    db = FakeDb(results=[FakeResult([existing])])

    result = await integrations.ensure_integration(
        "github", ProviderIntegrationEnsureRequest(workspace_id=workspace_id), db=db
    )

    assert db.added == []
    assert db.committed is False
    assert result.id == existing.id
    assert result.status == "connected"


@pytest.mark.asyncio
async def test_update_integration_status_updates_metadata():
    integration = make_integration()
    db = FakeDb(results=[FakeResult([integration])])

    payload = ProviderIntegrationStatusUpdateRequest(
        integration_id=integration.id, status="connected", installation_id="12345", external_account_id="acme"
    )
    result = await integrations.update_integration_status("github", payload, db=db)

    assert integration.status == "connected"
    assert integration.installation_id == "12345"
    assert integration.external_account_id == "acme"
    assert result.status == "connected"
    assert db.committed is True


@pytest.mark.asyncio
async def test_update_integration_status_raises_404_when_missing():
    db = FakeDb(results=[FakeResult([])])

    with pytest.raises(HTTPException) as error:
        await integrations.update_integration_status(
            "github", ProviderIntegrationStatusUpdateRequest(integration_id=uuid4(), status="disabled"), db=db
        )

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_save_credential_encrypts_and_creates_new_row(monkeypatch):
    integration = make_integration()
    db = FakeDb(results=[FakeResult([integration]), FakeResult([])])
    monkeypatch.setattr(crypto, "get_settings", lambda: type("S", (), {"credential_encryption_key": "test-key", "changethis_secret_key": None})())

    payload = CredentialSaveRequest(integration_id=integration.id, kind="access_token", value="ghp_secret_value")
    result = await integrations.save_credential("github", payload, db=db)

    created = next(item for item in db.added if isinstance(item, ProviderCredential))
    assert created.integration_id == integration.id
    assert created.credential_kind == "access_token"
    assert created.ciphertext != "ghp_secret_value"
    assert created.ciphertext is not None
    assert result.storage_reference == f"db:github:{integration.id}:access_token"


@pytest.mark.asyncio
async def test_save_credential_updates_existing_row_in_place(monkeypatch):
    integration = make_integration()
    existing_credential = ProviderCredential(
        id=uuid4(), integration_id=integration.id, credential_kind="access_token",
        storage_reference="db:github:old:access_token", scopes=[], status="active",
    )
    db = FakeDb(results=[FakeResult([integration]), FakeResult([existing_credential])])
    monkeypatch.setattr(crypto, "get_settings", lambda: type("S", (), {"credential_encryption_key": "test-key", "changethis_secret_key": None})())

    payload = CredentialSaveRequest(integration_id=integration.id, kind="access_token", value="ghp_new_value")
    await integrations.save_credential("github", payload, db=db)

    assert not any(isinstance(item, ProviderCredential) for item in db.added)
    assert existing_credential.ciphertext is not None


@pytest.mark.asyncio
async def test_get_credential_roundtrips_the_encrypted_value(monkeypatch):
    monkeypatch.setattr(crypto, "get_settings", lambda: type("S", (), {"credential_encryption_key": "test-key", "changethis_secret_key": None})())

    ciphertext, iv, tag = crypto.encrypt_credential("ghp_secret_value")
    credential = ProviderCredential(
        id=uuid4(), integration_id=uuid4(), credential_kind="access_token",
        storage_reference="ref", scopes=[], status="active", ciphertext=ciphertext, iv=iv, tag=tag,
    )
    db = FakeDb(results=[FakeResult([credential])])

    result = await integrations.get_credential("github", credential.integration_id, kind="access_token", db=db)

    assert result.value == "ghp_secret_value"


@pytest.mark.asyncio
async def test_get_credential_returns_none_when_missing():
    db = FakeDb(results=[FakeResult([])])

    result = await integrations.get_credential("github", uuid4(), kind="access_token", db=db)

    assert result.value is None


@pytest.mark.asyncio
async def test_delete_credentials_removes_all_rows_for_integration():
    integration_id = uuid4()
    credential_a = ProviderCredential(id=uuid4(), integration_id=integration_id, credential_kind="access_token", storage_reference="a", scopes=[], status="active")
    credential_b = ProviderCredential(id=uuid4(), integration_id=integration_id, credential_kind="installation_id", storage_reference="b", scopes=[], status="active")
    db = FakeDb(results=[FakeResult([credential_a, credential_b])])

    result = await integrations.delete_credentials("github", integration_id, db=db)

    assert result == {"removed": 2}
    assert db.deleted == [credential_a, credential_b]
    assert db.committed is True
