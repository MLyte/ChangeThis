from datetime import UTC, datetime, timedelta
import os
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://changethis:changethis@localhost/changethis")
os.environ.setdefault("SESSION_SECRET", "test-session-secret")

import pytest

from app.models import ProjectIssueMember, Session, User, Workspace, WorkspaceMember
from app.security import hash_session_token, workspace_access_from_token


class ScalarResult:
    def __init__(self, value=None):
        self.value = value

    def first(self):
        return self.value


class FakeDb:
    """Mimics a user who already owns their own workspace (own_workspace_id)
    but was also granted project-scoped access to a different workspace
    (shared_workspace_id) via ProjectIssueMember - the exact shape of the
    m.luyten / socmo-webapp situation."""

    def __init__(self, session, user, own_membership, project_access, requested_workspace):
        self.session = session
        self.user = user
        self.own_membership = own_membership
        self.project_access = project_access
        self.requested_workspace = requested_workspace

    async def execute(self, statement):
        statement_text = str(statement)

        if "project_issue_members" in statement_text:
            if (
                self.project_access
                and self.session.revoked_at is None
                and self.project_access.workspace_id == self.requested_workspace.id
            ):
                return ScalarResult((self.user, self.requested_workspace, self.project_access))
            return ScalarResult(None)

        if "memberships" in statement_text:
            if (
                self.own_membership.workspace_id == self.requested_workspace.id
                and self.session.revoked_at is None
            ):
                return ScalarResult((self.user, self.own_membership, self.requested_workspace))
            return ScalarResult(None)

        return ScalarResult(None)


def make_active_session(user_id, token) -> Session:
    return Session(
        id=uuid4(),
        user_id=user_id,
        token_hash=hash_session_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=1),
        revoked_at=None,
    )


@pytest.mark.asyncio
async def test_workspace_access_grants_synthetic_viewer_for_shared_workspace_despite_own_membership():
    token = "session-token"
    user = User(id=uuid4(), email="shared-user@example.com", password_hash="x", status="active")
    own_workspace = Workspace(id=uuid4(), name="Own workspace", owner_id=user.id, plan="free")
    shared_workspace = Workspace(id=uuid4(), name="Shared workspace", owner_id=uuid4(), plan="free")

    own_membership = WorkspaceMember(
        id=uuid4(), workspace_id=own_workspace.id, user_id=user.id, role="owner", status="active"
    )
    project_access = ProjectIssueMember(
        id=uuid4(),
        workspace_id=shared_workspace.id,
        project_key="ct_socmo_webapp",
        user_id=user.id,
        role="issue_member",
        status="active",
    )

    db = FakeDb(
        session=make_active_session(user.id, token),
        user=user,
        own_membership=own_membership,
        project_access=project_access,
        requested_workspace=shared_workspace,
    )

    resolved = await workspace_access_from_token(db, token, shared_workspace.id)

    assert resolved is not None
    resolved_user, membership, workspace = resolved
    assert resolved_user is user
    assert workspace is shared_workspace
    assert membership.workspace_id == shared_workspace.id
    assert membership.role == "viewer"


@pytest.mark.asyncio
async def test_workspace_access_still_resolves_real_membership_for_own_workspace():
    token = "session-token"
    user = User(id=uuid4(), email="owner@example.com", password_hash="x", status="active")
    own_workspace = Workspace(id=uuid4(), name="Own workspace", owner_id=user.id, plan="free")
    own_membership = WorkspaceMember(
        id=uuid4(), workspace_id=own_workspace.id, user_id=user.id, role="owner", status="active"
    )

    db = FakeDb(
        session=make_active_session(user.id, token),
        user=user,
        own_membership=own_membership,
        project_access=None,
        requested_workspace=own_workspace,
    )

    resolved = await workspace_access_from_token(db, token, own_workspace.id)

    assert resolved is not None
    _resolved_user, membership, _workspace = resolved
    assert membership.role == "owner"


@pytest.mark.asyncio
async def test_workspace_access_denies_workspace_with_no_membership_and_no_project_grant():
    token = "session-token"
    user = User(id=uuid4(), email="stranger@example.com", password_hash="x", status="active")
    own_workspace = Workspace(id=uuid4(), name="Own workspace", owner_id=user.id, plan="free")
    own_membership = WorkspaceMember(
        id=uuid4(), workspace_id=own_workspace.id, user_id=user.id, role="owner", status="active"
    )
    other_workspace = Workspace(id=uuid4(), name="Someone else's workspace", owner_id=uuid4(), plan="free")

    db = FakeDb(
        session=make_active_session(user.id, token),
        user=user,
        own_membership=own_membership,
        project_access=None,
        requested_workspace=other_workspace,
    )

    resolved = await workspace_access_from_token(db, token, other_workspace.id)

    assert resolved is None
