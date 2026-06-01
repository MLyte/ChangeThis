"""Store project issue members by project key.

Revision ID: 0003_project_issue_members_key
Revises: 0002_project_issue_members
Create Date: 2026-06-01
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_project_issue_members_key"
down_revision: str | None = "0002_project_issue_members"
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
        alter table project_issue_members
          add column if not exists project_key text;

        update project_issue_members pim
        set project_key = p.public_key
        from projects p
        where pim.project_id = p.id
          and pim.project_key is null;

        alter table project_issue_members
          alter column project_key set not null;

        alter table project_issue_members
          alter column project_id drop not null;

        alter table project_issue_members
          drop constraint if exists project_issue_members_project_user_unique;

        create unique index if not exists project_issue_members_workspace_project_key_user_unique
          on project_issue_members (workspace_id, project_key, user_id);

        create index if not exists project_issue_members_workspace_project_key_status_idx
          on project_issue_members (workspace_id, project_key, status);
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        drop index if exists project_issue_members_workspace_project_key_status_idx;
        drop index if exists project_issue_members_workspace_project_key_user_unique;

        alter table project_issue_members
          add constraint project_issue_members_project_user_unique unique (project_id, user_id);

        alter table project_issue_members
          alter column project_id set not null;

        alter table project_issue_members
          drop column if exists project_key;
        """
    )
