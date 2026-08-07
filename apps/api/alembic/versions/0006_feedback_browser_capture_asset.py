"""Add browser capture asset columns to feedbacks.

Revision ID: 0006_feedback_browser_capture_asset
Revises: 0005_widget_display_mode
Create Date: 2026-08-07
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0006_feedback_browser_capture_asset"
down_revision: str | None = "0005_widget_display_mode"
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
        alter table feedbacks add column if not exists screenshot_kind text;
        alter table feedbacks add column if not exists browser_capture_mime_type text;
        alter table feedbacks add column if not exists browser_capture_bytes integer;
        alter table feedbacks add column if not exists browser_capture_data_url text;
        alter table feedbacks add column if not exists browser_capture_thumbnail_data_url text;
        alter table feedbacks add column if not exists browser_capture_storage_path text;
        alter table feedbacks add column if not exists browser_capture_hash text;
        alter table feedbacks add column if not exists browser_capture_status text not null default 'active';
        alter table feedbacks add column if not exists browser_capture_last_used_at timestamptz;
        alter table feedbacks add column if not exists browser_capture_usage_count integer not null default 0;
        alter table feedbacks add column if not exists browser_capture_archived_at timestamptz;
        alter table feedbacks add column if not exists browser_capture_deleted_at timestamptz;
        alter table feedbacks add column if not exists browser_capture_created_at timestamptz;
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        alter table feedbacks drop column if exists browser_capture_created_at;
        alter table feedbacks drop column if exists browser_capture_deleted_at;
        alter table feedbacks drop column if exists browser_capture_archived_at;
        alter table feedbacks drop column if exists browser_capture_usage_count;
        alter table feedbacks drop column if exists browser_capture_last_used_at;
        alter table feedbacks drop column if exists browser_capture_status;
        alter table feedbacks drop column if exists browser_capture_hash;
        alter table feedbacks drop column if exists browser_capture_storage_path;
        alter table feedbacks drop column if exists browser_capture_thumbnail_data_url;
        alter table feedbacks drop column if exists browser_capture_data_url;
        alter table feedbacks drop column if exists browser_capture_bytes;
        alter table feedbacks drop column if exists browser_capture_mime_type;
        alter table feedbacks drop column if exists screenshot_kind;
        """
    )
