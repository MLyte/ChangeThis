from datetime import UTC, datetime
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException

from app.models import ExternalIssue, Feedback, IssueTarget, Project, ProviderIssueAttempt
from app.routers import feedbacks
from app.schemas import (
    ExternalIssueSpec,
    RecordBrowserCaptureRequest,
    RecordExternalIssueStateRequest,
    RecordIssueAttemptRequest,
    UpdateIssueDraftRequest,
    WorkspaceScopedActionRequest,
)


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

    async def refresh(self, _item):
        return None

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


def make_feedback(project_id, issue_target_id=None, **overrides) -> Feedback:
    defaults = dict(
        id=uuid4(),
        project_id=project_id,
        issue_target_id=issue_target_id,
        status="raw",
        type="pin",
        message="Le bouton est mal aligné",
        page_url="https://example.com/pricing",
        payload={"type": "pin", "message": "Le bouton est mal aligné"},
        issue_draft_title="Le bouton est mal aligné",
        issue_draft_description="Le bouton est mal aligné",
        issue_draft_labels=["feedback"],
        screenshot_status="active",
        browser_capture_status="active",
        browser_capture_usage_count=0,
        screenshot_usage_count=0,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    defaults.update(overrides)
    return Feedback(**defaults)


@pytest.mark.asyncio
async def test_get_feedback_returns_full_response():
    project = make_project()
    issue_target = make_issue_target(project.id)
    fb = make_feedback(project.id, issue_target.id)
    db = FakeDb(results=[FakeResult([(fb, project, issue_target)]), FakeResult([]), FakeResult([])])

    result = await feedbacks.get_feedback(fb.id, workspace_id=None, db=db)

    assert result.id == fb.id
    assert result.project_key == project.public_key
    assert result.issue_target.namespace == "acme"
    assert result.retry_count == 0
    assert result.external_issue is None


@pytest.mark.asyncio
async def test_get_feedback_raises_404_when_missing():
    db = FakeDb(results=[FakeResult([])])

    with pytest.raises(HTTPException) as error:
        await feedbacks.get_feedback(uuid4(), workspace_id=None, db=db)

    assert error.value.status_code == 404


@pytest.mark.asyncio
async def test_list_feedbacks_maps_every_row():
    project = make_project()
    fb = make_feedback(project.id)
    db = FakeDb(results=[FakeResult([(fb, project, None)]), FakeResult([]), FakeResult([])])

    result = await feedbacks.list_feedbacks(workspace_id=project.workspace_id, project_key=None, status_filter=None, db=db)

    assert len(result) == 1
    assert result[0].id == fb.id


@pytest.mark.asyncio
async def test_mark_issue_creation_pending_transitions_status_and_logs_event():
    project = make_project()
    issue_target = make_issue_target(project.id)
    fb = make_feedback(project.id, issue_target.id)
    db = FakeDb(results=[FakeResult([(fb, project, issue_target)]), FakeResult([]), FakeResult([])])

    await feedbacks.mark_issue_creation_pending(fb.id, WorkspaceScopedActionRequest(workspace_id=project.workspace_id), db=db)

    assert fb.status == "issue_creation_pending"
    assert db.committed is True
    event = db.added[0]
    assert event.to_status == "issue_creation_pending"
    assert event.reason == "provider_issue_creation_started"


@pytest.mark.asyncio
async def test_record_issue_attempt_ok_creates_external_issue_and_sets_sent_status():
    project = make_project()
    issue_target = make_issue_target(project.id)
    fb = make_feedback(project.id, issue_target.id, status="issue_creation_pending")
    db = FakeDb(results=[
        FakeResult([(fb, project, issue_target)]),
        FakeResult([]),  # no existing attempt
        FakeResult([]),  # no existing external issue
        FakeResult([]),  # trailing load_extras: attempt
        FakeResult([]),  # trailing load_extras: external issue
    ])

    payload = RecordIssueAttemptRequest(
        workspace_id=project.workspace_id,
        ok=True,
        external_issue=ExternalIssueSpec(provider="github", number=42, url="https://github.com/acme/site/issues/42", state="open"),
    )

    await feedbacks.record_issue_attempt(fb.id, payload, db=db)

    assert fb.status == "sent_to_provider"
    created_attempt = next(item for item in db.added if isinstance(item, ProviderIssueAttempt))
    assert created_attempt.provider == "github"
    assert created_attempt.idempotency_key == f"changethis:{fb.id}"
    assert created_attempt.status == "succeeded"
    created_external = next(item for item in db.added if isinstance(item, ExternalIssue))
    assert created_external.url == "https://github.com/acme/site/issues/42"
    assert created_external.external_number == 42


@pytest.mark.asyncio
async def test_record_issue_attempt_failed_increments_retry_count():
    project = make_project()
    issue_target = make_issue_target(project.id)
    fb = make_feedback(project.id, issue_target.id, status="issue_creation_pending")
    existing_attempt = ProviderIssueAttempt(
        id=uuid4(), feedback_id=fb.id, provider="github", idempotency_key=f"changethis:{fb.id}",
        status="pending", retry_count=1,
    )
    db = FakeDb(results=[
        FakeResult([(fb, project, issue_target)]),
        FakeResult([existing_attempt]),
        FakeResult([]),  # trailing load_extras: attempt
        FakeResult([]),  # trailing load_extras: external issue
    ])

    payload = RecordIssueAttemptRequest(workspace_id=project.workspace_id, ok=False, error="rate limited", retryable=True)

    await feedbacks.record_issue_attempt(fb.id, payload, db=db)

    assert fb.status == "retrying"
    assert existing_attempt.retry_count == 2
    assert existing_attempt.status == "retrying"
    assert existing_attempt.last_error == "rate limited"
    assert not any(isinstance(item, ProviderIssueAttempt) for item in db.added)


@pytest.mark.asyncio
async def test_record_external_issue_state_marks_resolved_when_closed():
    project = make_project()
    issue_target = make_issue_target(project.id)
    fb = make_feedback(project.id, issue_target.id, status="sent_to_provider")
    existing_external = ExternalIssue(
        id=uuid4(), feedback_id=fb.id, issue_target_id=issue_target.id, provider="github",
        url="https://github.com/acme/site/issues/42", state="open",
    )
    db = FakeDb(results=[
        FakeResult([(fb, project, issue_target)]),
        FakeResult([existing_external]),
        FakeResult([]),
        FakeResult([existing_external]),
    ])

    payload = RecordExternalIssueStateRequest(
        workspace_id=project.workspace_id, provider="github", number=42,
        url="https://github.com/acme/site/issues/42", state="closed",
    )

    await feedbacks.record_external_issue_state(fb.id, payload, db=db)

    assert fb.status == "resolved"
    assert existing_external.state == "closed"


@pytest.mark.asyncio
async def test_mark_feedback_kept_does_not_touch_external_issue():
    project = make_project()
    fb = make_feedback(project.id, status="raw")
    db = FakeDb(results=[FakeResult([(fb, project, None)]), FakeResult([]), FakeResult([])])

    await feedbacks.mark_feedback_kept(fb.id, WorkspaceScopedActionRequest(workspace_id=project.workspace_id), db=db)

    assert fb.status == "kept"
    event = db.added[0]
    assert event.reason == "kept_without_issue"
    assert event.external_url is None


@pytest.mark.asyncio
async def test_mark_feedback_ignored_transitions_status():
    project = make_project()
    fb = make_feedback(project.id, status="raw")
    db = FakeDb(results=[FakeResult([(fb, project, None)]), FakeResult([]), FakeResult([])])

    await feedbacks.mark_feedback_ignored(fb.id, WorkspaceScopedActionRequest(workspace_id=project.workspace_id), db=db)

    assert fb.status == "ignored"


@pytest.mark.asyncio
async def test_update_feedback_issue_draft_updates_columns():
    project = make_project()
    fb = make_feedback(project.id)
    db = FakeDb(results=[FakeResult([(fb, project, None)]), FakeResult([]), FakeResult([])])

    payload = UpdateIssueDraftRequest(workspace_id=project.workspace_id, title="New title", description="New description", labels=["bug"])
    await feedbacks.update_feedback_issue_draft(fb.id, payload, db=db)

    assert fb.issue_draft_title == "New title"
    assert fb.issue_draft_description == "New description"
    assert fb.issue_draft_labels == ["bug"]


@pytest.mark.asyncio
async def test_record_browser_capture_sets_asset_columns():
    project = make_project()
    fb = make_feedback(project.id)
    db = FakeDb(results=[FakeResult([(fb, project, None)]), FakeResult([]), FakeResult([])])

    data_url = "data:image/jpeg;base64,aGVsbG8="
    await feedbacks.record_browser_capture(fb.id, RecordBrowserCaptureRequest(workspace_id=project.workspace_id, data_url=data_url), db=db)

    assert fb.browser_capture_mime_type == "image/jpeg"
    assert fb.browser_capture_data_url == data_url
    assert fb.browser_capture_usage_count == 1


@pytest.mark.asyncio
async def test_clear_workspace_feedbacks_deletes_all_and_counts_events():
    project = make_project()
    fb_a = make_feedback(project.id)
    fb_b = make_feedback(project.id)
    db = FakeDb(results=[FakeResult([fb_a, fb_b]), FakeResult([object(), object(), object()])])

    result = await feedbacks.clear_workspace_feedbacks(project.workspace_id, db=db)

    assert result == {"feedbacks": 2, "events": 3}
    assert db.deleted == [fb_a, fb_b]


@pytest.mark.asyncio
async def test_cleanup_screenshots_requires_matching_bearer_secret(monkeypatch):
    monkeypatch.setattr(feedbacks, "get_settings", lambda: type("S", (), {"changethis_cron_secret": "s3cret", "changethis_secret_key": None})())
    db = FakeDb(results=[FakeResult([])])

    with pytest.raises(HTTPException) as error:
        await feedbacks.cleanup_screenshots(None, authorization="Bearer wrong", db=db)

    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_cleanup_screenshots_archives_old_large_screenshots(monkeypatch):
    monkeypatch.setattr(feedbacks, "get_settings", lambda: type("S", (), {"changethis_cron_secret": "s3cret", "changethis_secret_key": None})())
    old_feedback = Feedback(
        id=uuid4(), project_id=uuid4(), status="resolved", type="pin", message="", page_url="https://example.com",
        payload={}, issue_draft_labels=[], screenshot_status="active", screenshot_data_url="data:image/png;base64,xx",
        screenshot_mime_type="image/png", screenshot_bytes=2_000_000,
        screenshot_last_used_at=datetime(2000, 1, 1, tzinfo=UTC), created_at=datetime(2000, 1, 1, tzinfo=UTC),
        browser_capture_status="active", browser_capture_usage_count=0, screenshot_usage_count=1,
    )
    db = FakeDb(results=[FakeResult([old_feedback])])

    result = await feedbacks.cleanup_screenshots(None, authorization="Bearer s3cret", db=db)

    assert result["archived"] == 1
    assert old_feedback.screenshot_status == "archived"
    assert old_feedback.screenshot_data_url is None
