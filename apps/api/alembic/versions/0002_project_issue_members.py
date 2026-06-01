"""Add project issue members.

Revision ID: 0002_project_issue_members
Revises: 0001_internal_schema
Create Date: 2026-06-01
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_project_issue_members"
down_revision: str | None = "0001_internal_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _execute_statements(sql: str) -> None:
    for statement in sql.split(";"):
        statement = statement.strip()
        if statement:
            op.execute(statement)


def upgrade() -> None:
    _execute_statements(
        """
        create table if not exists project_issue_members (
          id uuid primary key default gen_random_uuid(),
          workspace_id uuid not null references workspaces(id) on delete cascade,
          project_id uuid not null references projects(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          role text not null default 'issue_member',
          status text not null default 'active',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint project_issue_members_role_check check (role in ('issue_member')),
          constraint project_issue_members_status_check check (status in ('active', 'disabled')),
          constraint project_issue_members_project_user_unique unique (project_id, user_id)
        );

        create index if not exists project_issue_members_workspace_user_status_idx on project_issue_members (workspace_id, user_id, status);
        create index if not exists project_issue_members_project_status_idx on project_issue_members (project_id, status);
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        drop table if exists project_issue_members;
        """
    )
