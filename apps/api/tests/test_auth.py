from datetime import UTC, datetime, timedelta
import os
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest
from fastapi import HTTPException, Response
from pydantic import ValidationError

from app.models import Session, User, Workspace, WorkspaceMember
from app.routers import auth
from app.schemas import LoginRequest, SignUpRequest
from app.security import hash_session_token


class ScalarResult:
    def __init__(self, value=None):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def first(self):
        return self.value


class FakeDb:
    def __init__(self, existing_email=None):
        self.existing_email = existing_email
        self.objects = []
        self.committed = False
        self.revoked_hashes = []

    async def execute(self, statement):
        statement_text = str(statement)
        if "FROM users" in statement_text and self.existing_email:
            return ScalarResult(uuid4())

        if "FROM users" in statement_text and "sessions" not in statement_text:
            return ScalarResult(next((item for item in self.objects if isinstance(item, User)), None))

        if "JOIN sessions" in statement_text:
            session = next((item for item in self.objects if isinstance(item, Session)), None)
            user = next((item for item in self.objects if isinstance(item, User)), None)
            membership = next((item for item in self.objects if isinstance(item, WorkspaceMember)), None)
            workspace = next((item for item in self.objects if isinstance(item, Workspace)), None)
            if session and user and membership and workspace and session.revoked_at is None:
                return ScalarResult((user, membership, workspace))
            return ScalarResult(None)

        if "UPDATE sessions" in statement_text:
            for item in self.objects:
                if isinstance(item, Session) and item.revoked_at is None:
                    item.revoked_at = datetime.now(UTC)
                    self.revoked_hashes.append(item.token_hash)
            return ScalarResult(None)

        return ScalarResult(None)

    def add(self, item):
        self.objects.append(item)

    async def flush(self):
        for item in self.objects:
            if getattr(item, "id", None) is None:
                item.id = uuid4()

    async def commit(self):
        self.committed = True


@pytest.fixture(autouse=True)
def clear_settings_cache():
    cache_clear = getattr(auth.get_settings, "cache_clear", None)
    if cache_clear:
        cache_clear()
    yield
    cache_clear = getattr(auth.get_settings, "cache_clear", None)
    if cache_clear:
        cache_clear()


@pytest.mark.asyncio
async def test_signup_creates_user_workspace_owner_membership_and_session(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(
        enable_public_signup=True,
        session_cookie_name="changethis_internal_session",
        session_ttl_seconds=1209600,
    ))
    monkeypatch.setattr(auth, "hash_password", lambda password: f"hashed:{password}")
    db = FakeDb()

    result = await auth.signup(
        SignUpRequest(email="Owner@Example.com", password="correct-password", workspace_name="CRA"),
        Response(),
        db,
    )

    user = next(item for item in db.objects if isinstance(item, User))
    workspace = next(item for item in db.objects if isinstance(item, Workspace))
    membership = next(item for item in db.objects if isinstance(item, WorkspaceMember))
    session = next(item for item in db.objects if isinstance(item, Session))

    assert db.committed is True
    assert user.email == "owner@example.com"
    assert user.password_hash == "hashed:correct-password"
    assert workspace.name == "CRA"
    assert workspace.owner_id == user.id
    assert membership.user_id == user.id
    assert membership.workspace_id == workspace.id
    assert membership.role == "owner"
    assert session.user_id == user.id
    assert result.access_token
    assert result.user.email == "owner@example.com"
    assert result.workspace.id == workspace.id
    assert result.workspace.role == "owner"


@pytest.mark.asyncio
async def test_signup_rejects_duplicate_email_case_insensitively(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(enable_public_signup=True))
    db = FakeDb(existing_email="owner@example.com")

    with pytest.raises(HTTPException) as error:
        await auth.signup(
            SignUpRequest(email="Owner@Example.com", password="correct-password", workspace_name="CRA"),
            Response(),
            db,
        )

    assert error.value.status_code == 409


def test_signup_rejects_short_password():
    with pytest.raises(ValidationError):
        SignUpRequest(email="owner@example.com", password="short", workspace_name="CRA")


@pytest.mark.asyncio
async def test_signup_can_be_disabled(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(enable_public_signup=False))

    with pytest.raises(HTTPException) as error:
        await auth.signup(
            SignUpRequest(email="owner@example.com", password="correct-password", workspace_name="CRA"),
            Response(),
            FakeDb(),
        )

    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_login_then_logout_revokes_session(monkeypatch):
    monkeypatch.setattr(auth, "get_settings", lambda: SimpleNamespace(
        session_cookie_name="changethis_internal_session",
        session_ttl_seconds=1209600,
    ))
    monkeypatch.setattr(auth, "verify_password", lambda password, password_hash: password == "correct-password")
    db = FakeDb()
    user = User(id=uuid4(), email="owner@example.com", password_hash="hashed-password", status="active")
    workspace = Workspace(id=uuid4(), name="CRA", owner_id=user.id, plan="free")
    membership = WorkspaceMember(id=uuid4(), workspace_id=workspace.id, user_id=user.id, role="owner", status="active")
    db.objects.extend([user, workspace, membership])

    result = await auth.login(LoginRequest(email="owner@example.com", password="correct-password"), Response(), db)
    session = next(item for item in db.objects if isinstance(item, Session))
    session.expires_at = datetime.now(UTC) + timedelta(days=1)

    await auth.logout(Response(), result.access_token, db)

    assert session.token_hash == hash_session_token(result.access_token)
    assert session.revoked_at is not None
    assert db.committed is True
