from datetime import UTC, datetime
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException

from app.models import IssueTarget, Project
from app.routers import feedback
from app.schemas import IssueDraftSchema, PublicFeedbackRequest


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalar_one_or_none(self):
        return self._rows[0] if self._rows else None


class FakeDb:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.added = []
        self.committed = False
        self.refreshed = []

    async def execute(self, _statement):
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


def make_payload(**overrides) -> PublicFeedbackRequest:
    defaults = dict(
        projectKey="ct_existing",
        type="pin",
        message="Le bouton est mal aligné",
        metadata={
            "url": "https://example.com/pricing",
            "title": "Pricing",
            "userAgent": "Mozilla/5.0",
            "viewport": {"width": 1280, "height": 800},
            "devicePixelRatio": 2,
        },
        pin={"x": 120, "y": 340, "selector": "#cta", "text": "Acheter"},
        issueDraft=IssueDraftSchema(title="Le bouton est mal aligné", description="Le bouton est mal aligné", labels=["feedback"]),
    )
    defaults.update(overrides)
    return PublicFeedbackRequest(**defaults)


@pytest.mark.asyncio
async def test_create_feedback_derives_flat_columns_from_metadata_and_pin(monkeypatch):
    project = make_project()
    issue_target = make_issue_target(project.id)
    db = FakeDb(results=[FakeResult([project]), FakeResult([issue_target])])
    monkeypatch.setattr(feedback, "AsyncSessionLocal", fake_session_local(db))

    result = await feedback.create_feedback(make_payload(), origin="https://example.com")

    created_feedback = db.added[0]
    assert created_feedback.page_url == "https://example.com/pricing"
    assert created_feedback.page_title == "Pricing"
    assert created_feedback.browser == "Mozilla/5.0"
    assert created_feedback.viewport_width == 1280
    assert created_feedback.viewport_height == 800
    assert created_feedback.device_pixel_ratio == 2
    assert created_feedback.pin_x == 120
    assert created_feedback.pin_y == 340
    assert created_feedback.element_selector == "#cta"
    assert created_feedback.element_text == "Acheter"
    assert created_feedback.issue_draft_title == "Le bouton est mal aligné"
    assert created_feedback.issue_draft_labels == ["feedback"]
    assert "screenshotDataUrl" not in created_feedback.payload
    assert "issueDraft" not in created_feedback.payload
    assert db.committed is True
    assert result.status == "raw"
    assert result.issue_target.namespace == "acme"


@pytest.mark.asyncio
async def test_create_feedback_stores_screenshot_asset_columns(monkeypatch):
    project = make_project()
    issue_target = make_issue_target(project.id)
    db = FakeDb(results=[FakeResult([project]), FakeResult([issue_target])])
    monkeypatch.setattr(feedback, "AsyncSessionLocal", fake_session_local(db))

    data_url = "data:image/png;base64,aGVsbG8="
    payload = make_payload(screenshotDataUrl=data_url, screenshotSource="user_upload")

    await feedback.create_feedback(payload, origin="https://example.com")

    created_feedback = db.added[0]
    assert created_feedback.screenshot_mime_type == "image/png"
    assert created_feedback.screenshot_kind == "user_upload"
    assert created_feedback.screenshot_data_url == data_url
    assert created_feedback.screenshot_status == "active"
    assert created_feedback.screenshot_usage_count == 1


@pytest.mark.asyncio
async def test_create_feedback_rejects_unknown_project(monkeypatch):
    db = FakeDb(results=[FakeResult([])])
    monkeypatch.setattr(feedback, "AsyncSessionLocal", fake_session_local(db))

    with pytest.raises(HTTPException) as error:
        await feedback.create_feedback(make_payload(), origin="https://example.com")

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_create_feedback_rejects_disallowed_origin(monkeypatch):
    project = make_project(allowed_origins=["https://other.example.com"])
    db = FakeDb(results=[FakeResult([project])])
    monkeypatch.setattr(feedback, "AsyncSessionLocal", fake_session_local(db))

    with pytest.raises(HTTPException) as error:
        await feedback.create_feedback(make_payload(), origin="https://example.com")

    assert error.value.status_code == 403
    assert db.committed is False
