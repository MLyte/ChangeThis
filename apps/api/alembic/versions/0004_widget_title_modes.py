"""Add widget title and mode configuration.

Revision ID: 0004_widget_title_modes
Revises: 0003_project_issue_members_project_key
Create Date: 2026-06-02
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_widget_title_modes"
down_revision: str | None = "0003_project_issue_members_project_key"
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
        alter table projects
          add column if not exists widget_title text not null default 'Que faut-il changer ?';

        alter table projects
          add column if not exists widget_modes text[] not null default array['comment','pin','screenshot']::text[];

        alter table projects
          drop constraint if exists projects_widget_title_length_check;

        alter table projects
          add constraint projects_widget_title_length_check
          check (char_length(widget_title) between 1 and 240);

        alter table projects
          drop constraint if exists projects_widget_modes_check;

        alter table projects
          add constraint projects_widget_modes_check
          check (widget_modes <@ array['comment','pin','screenshot']::text[] and cardinality(widget_modes) > 0);
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        alter table projects
          drop constraint if exists projects_widget_modes_check;

        alter table projects
          drop constraint if exists projects_widget_title_length_check;

        alter table projects
          drop column if exists widget_modes;

        alter table projects
          drop column if exists widget_title;
        """
    )
