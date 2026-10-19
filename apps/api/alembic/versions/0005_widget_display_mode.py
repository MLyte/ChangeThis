"""Add widget display mode.

Revision ID: 0005_widget_display_mode
Revises: 0004_widget_title_modes
Create Date: 2026-06-03
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0005_widget_display_mode"
down_revision: str | None = "0004_widget_title_modes"
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
          add column if not exists widget_display_mode text not null default 'standard';

        update projects
        set widget_display_mode = 'subtle'
        where widget_button_variant = 'subtle'
          and widget_display_mode = 'standard';

        alter table projects
          drop constraint if exists projects_widget_display_mode_check;

        alter table projects
          add constraint projects_widget_display_mode_check
          check (widget_display_mode in ('standard', 'subtle', 'hidden', 'disabled'));
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        alter table projects
          drop constraint if exists projects_widget_display_mode_check;

        alter table projects
          drop column if exists widget_display_mode;
        """
    )
