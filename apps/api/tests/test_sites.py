from datetime import UTC, datetime
import os
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException

from app.models import IssueTarget, Project
from app.routers import sites
from app.schemas import IssueTargetSpec, IssueTargetUpdateRequest, SiteCreateRequest, SiteWidgetUpdateRequest


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None

    def scalars(self):
        return self


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.statements = []
        self.added = []
        self.deleted = []
        self.refreshed = []
        self.committed = False

    async def execute(self, statement):
        self.statements.append(str(statement))
        if self.results:
            return self.results.pop(0)
        return FakeResult([])

    def add(self, item):
        self.added.append(item)

    async def flush(self):
        for item in self.added:
            if getattr(item, "id", None) is None:
                item.id = uuid4()

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)
        if getattr(item, "created_at", None) is None:
            item.created_at = datetime.now(UTC)
        if hasattr(item, "updated_at") and item.updated_at is None:
            item.updated_at = datetime.now(UTC)

    async def delete(self, item):
        self.deleted.append(item)


def make_project(**overrides) -> Project:
    defaults = dict(
        id=uuid4(),
        workspace_id=uuid4(),
        name="Marketing site",
        public_key="ct_existing",
        allowed_origins=["https://example.com"],
        widget_locale="fr",
        widget_button_position="bottom-right",
        widget_button_variant="default",
        widget_display_mode="standard",
        widget_reporter_fields="optional",
        widget_title="Que faut-il changer ?",
        widget_modes=["comment", "pin", "screenshot"],
        issue_creation_mode="manual",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return Project(**defaults)


def make_issue_target(project_id, **overrides) -> IssueTarget:
    defaults = dict(
        id=uuid4(),
        project_id=project_id,
        integration_id=None,
        provider="github",
        namespace="acme",
        project_name="site",
        external_project_id=None,
        web_url="https://github.com/acme/site",
        created_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return IssueTarget(**defaults)


@pytest.mark.asyncio
async def test_list_sites_returns_sites_for_workspace(monkeypatch):
    workspace_id = uuid4()
    project = make_project(workspace_id=workspace_id)
    issue_target = make_issue_target(project.id)
    db = FakeDb(results=[FakeResult([(project, issue_target)])])

    async def fake_require_workspace_session(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=workspace_id, role="member"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_session", fake_require_workspace_session)

    result = await sites.list_sites(workspace_id=workspace_id, changethis_internal_session="token", db=db)

    assert len(result) == 1
    assert result[0].public_key == project.public_key
    assert result[0].issue_target.namespace == "acme"


@pytest.mark.asyncio
async def test_create_site_creates_project_and_issue_target(monkeypatch):
    workspace_id = uuid4()
    db = FakeDb(results=[FakeResult([])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=workspace_id, role="admin"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    payload = SiteCreateRequest(
        workspace_id=workspace_id,
        public_key="ct_1234567890ab",
        name="Marketing site",
        allowed_origins=["https://example.com"],
        issue_target=IssueTargetSpec(provider="github", namespace="acme", project_name="site"),
    )

    result = await sites.create_site(payload, changethis_internal_session="token", db=db)

    created_project = next(item for item in db.added if isinstance(item, Project))
    created_issue_target = next(item for item in db.added if isinstance(item, IssueTarget))

    assert db.committed is True
    assert created_project.public_key == "ct_1234567890ab"
    assert created_issue_target.project_id == created_project.id
    assert created_issue_target.namespace == "acme"
    assert result.public_key == "ct_1234567890ab"


@pytest.mark.asyncio
async def test_create_site_rejects_duplicate_public_key(monkeypatch):
    workspace_id = uuid4()
    existing = make_project(workspace_id=workspace_id, public_key="ct_1234567890ab")
    db = FakeDb(results=[FakeResult([existing])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=workspace_id, role="admin"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    payload = SiteCreateRequest(
        workspace_id=workspace_id,
        public_key="ct_1234567890ab",
        name="Marketing site",
        allowed_origins=["https://example.com"],
        issue_target=IssueTargetSpec(provider="github", namespace="acme", project_name="site"),
    )

    with pytest.raises(HTTPException) as error:
        await sites.create_site(payload, changethis_internal_session="token", db=db)

    assert error.value.status_code == 409
    assert db.committed is False


@pytest.mark.asyncio
async def test_update_site_widget_settings_updates_project(monkeypatch):
    project = make_project()
    issue_target = make_issue_target(project.id)
    db = FakeDb(results=[FakeResult([(project, issue_target)])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=project.workspace_id, role="owner"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    payload = SiteWidgetUpdateRequest(
        name="Nouveau nom",
        widget_locale="en",
        widget_button_position="top-left",
        widget_button_variant="subtle",
        widget_display_mode="subtle",
        widget_reporter_fields="required",
        widget_title="Give feedback",
        widget_modes=["comment"],
        issue_creation_mode="automatic",
        allowed_origin="https://new-origin.example.com",
    )

    result = await sites.update_site_widget_settings(project.public_key, payload, changethis_internal_session="token", db=db)

    assert db.committed is True
    assert project.name == "Nouveau nom"
    assert project.widget_locale == "en"
    assert project.allowed_origins == ["https://new-origin.example.com"]
    assert result.widget_title == "Give feedback"


@pytest.mark.asyncio
async def test_update_site_widget_settings_returns_404_when_missing(monkeypatch):
    db = FakeDb(results=[FakeResult([])])

    payload = SiteWidgetUpdateRequest(
        widget_locale="fr",
        widget_button_position="bottom-right",
        widget_button_variant="default",
        widget_display_mode="standard",
        widget_reporter_fields="optional",
        widget_title="Que faut-il changer ?",
        widget_modes=["comment"],
        issue_creation_mode="manual",
    )

    with pytest.raises(HTTPException) as error:
        await sites.update_site_widget_settings("ct_missing", payload, changethis_internal_session="token", db=db)

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_site_removes_project(monkeypatch):
    project = make_project()
    db = FakeDb(results=[FakeResult([(project, None)])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=project.workspace_id, role="owner"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    await sites.delete_site(project.public_key, changethis_internal_session="token", db=db)

    assert project in db.deleted
    assert db.committed is True


@pytest.mark.asyncio
async def test_clear_sites_deletes_all_projects_in_workspace(monkeypatch):
    workspace_id = uuid4()
    project_a = make_project(workspace_id=workspace_id)
    project_b = make_project(workspace_id=workspace_id)
    db = FakeDb(results=[FakeResult([project_a, project_b])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=workspace_id, role="owner"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    result = await sites.clear_sites(workspace_id, changethis_internal_session="token", db=db)

    assert result == {"deleted": 2}
    assert db.deleted == [project_a, project_b]
    assert db.committed is True


@pytest.mark.asyncio
async def test_save_issue_target_creates_target_when_missing(monkeypatch):
    project = make_project()
    db = FakeDb(results=[FakeResult([(project, None)])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=project.workspace_id, role="owner"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    payload = IssueTargetUpdateRequest(
        project_key=project.public_key,
        provider="gitlab",
        namespace="group/subgroup",
        project_name="repo",
    )

    result = await sites.save_issue_target(project.public_key, payload, changethis_internal_session="token", db=db)

    created_issue_target = next(item for item in db.added if isinstance(item, IssueTarget))
    assert created_issue_target.project_id == project.id
    assert created_issue_target.provider == "gitlab"
    assert result.issue_target.namespace == "group/subgroup"


@pytest.mark.asyncio
async def test_save_issue_target_updates_existing_target_in_place(monkeypatch):
    project = make_project()
    issue_target = make_issue_target(project.id)
    db = FakeDb(results=[FakeResult([(project, issue_target)])])

    async def fake_require_workspace_admin(_token, _db, _workspace_id):
        return SimpleNamespace(), SimpleNamespace(workspace_id=project.workspace_id, role="owner"), SimpleNamespace()

    monkeypatch.setattr(sites, "require_workspace_admin", fake_require_workspace_admin)

    payload = IssueTargetUpdateRequest(
        project_key=project.public_key,
        provider="gitlab",
        namespace="group/subgroup",
        project_name="repo",
    )

    await sites.save_issue_target(project.public_key, payload, changethis_internal_session="token", db=db)

    assert not any(isinstance(item, IssueTarget) for item in db.added)
    assert issue_target.provider == "gitlab"
    assert issue_target.namespace == "group/subgroup"


@pytest.mark.asyncio
async def test_require_workspace_session_rejects_mismatched_workspace(monkeypatch):
    other_workspace_id = uuid4()

    async def fake_session_from_token(_db, _token):
        return SimpleNamespace(), SimpleNamespace(workspace_id=uuid4(), role="member"), SimpleNamespace()

    monkeypatch.setattr(sites, "session_from_token", fake_session_from_token)

    with pytest.raises(HTTPException) as error:
        await sites.require_workspace_session("token", FakeDb(), other_workspace_id)

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_require_workspace_admin_rejects_viewer_role(monkeypatch):
    workspace_id = uuid4()

    async def fake_session_from_token(_db, _token):
        return SimpleNamespace(), SimpleNamespace(workspace_id=workspace_id, role="viewer"), SimpleNamespace()

    monkeypatch.setattr(sites, "session_from_token", fake_session_from_token)

    with pytest.raises(HTTPException) as error:
        await sites.require_workspace_admin("token", FakeDb(), workspace_id)

    assert error.value.status_code == 403
