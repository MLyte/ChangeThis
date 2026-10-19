from datetime import UTC, datetime
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException

from app.models import IssueTarget, Project
from app.routers import public_projects


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self, result):
        self.result = result
        self.statements = []

    async def execute(self, statement):
        self.statements.append(str(statement))
        return self.result


class FakeSessionContext:
    def __init__(self, db):
        self.db = db

    async def __aenter__(self):
        return self.db

    async def __aexit__(self, exc_type, exc, tb):
        return False


def fake_session_local(db: FakeDb):
    return lambda: FakeSessionContext(db)


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
async def test_get_public_project_returns_site_by_public_key(monkeypatch):
    project = make_project()
    issue_target = make_issue_target(project.id)
    db = FakeDb(FakeResult([(project, issue_target)]))
    monkeypatch.setattr(public_projects, "AsyncSessionLocal", fake_session_local(db))

    result = await public_projects.get_public_project(project.public_key)

    assert result.public_key == project.public_key
    assert result.issue_target.namespace == "acme"


@pytest.mark.asyncio
async def test_get_public_project_raises_404_when_unknown(monkeypatch):
    db = FakeDb(FakeResult([]))
    monkeypatch.setattr(public_projects, "AsyncSessionLocal", fake_session_local(db))

    with pytest.raises(HTTPException) as error:
        await public_projects.get_public_project("ct_unknown")

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_get_known_origin_reports_true_when_matched(monkeypatch):
    db = FakeDb(FakeResult([uuid4()]))
    monkeypatch.setattr(public_projects, "AsyncSessionLocal", fake_session_local(db))

    result = await public_projects.get_known_origin("https://example.com")

    assert result == {"known": True}


@pytest.mark.asyncio
async def test_get_known_origin_reports_false_when_no_match(monkeypatch):
    db = FakeDb(FakeResult([]))
    monkeypatch.setattr(public_projects, "AsyncSessionLocal", fake_session_local(db))

    result = await public_projects.get_known_origin("https://unknown.example.com")

    assert result == {"known": False}
