from datetime import UTC, datetime
import os
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest

from app.models import ProjectIssueMember, User
from app.routers import project_issue_members


class RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class CapturingDb:
    def __init__(self, rows):
        self.rows = rows
        self.statements = []

    async def execute(self, statement):
        self.statements.append(str(statement))
        return RowsResult(self.rows)


@pytest.mark.asyncio
async def test_list_current_user_issue_members_can_span_workspaces(monkeypatch):
    user = User(id=uuid4(), email="viewer@example.com", password_hash="hashed", status="active")
    membership = SimpleNamespace(workspace_id=uuid4(), role="owner")
    workspace = SimpleNamespace(id=membership.workspace_id)
    member = ProjectIssueMember(
        workspace_id=uuid4(),
        project_key="ct_shared",
        user_id=user.id,
        role="issue_member",
        status="active",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db = CapturingDb([(member, user.email)])

    async def fake_session(_token, _db):
        return user, membership, workspace

    monkeypatch.setattr(project_issue_members, "require_workspace_session", fake_session)

    result = await project_issue_members.list_project_issue_members(
        workspace_id=None,
        project_key=None,
        user_id=user.id,
        changethis_internal_session="session-token",
        db=db,
    )

    assert result[0].workspace_id == member.workspace_id
    assert "project_issue_members.workspace_id IS NULL" not in db.statements[0]
