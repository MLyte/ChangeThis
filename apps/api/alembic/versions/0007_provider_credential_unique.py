"""Add unique index on provider integration credentials.

Revision ID: 0007_provider_credential_unique
Revises: 0006_feedback_browser_capture_asset
Create Date: 2026-08-07
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007_provider_credential_unique"
down_revision: str | None = "0006_feedback_browser_capture_asset"
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
        create unique index if not exists provider_integration_credentials_integration_kind_unique
        on provider_integration_credentials (integration_id, credential_kind);
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        drop index if exists provider_integration_credentials_integration_kind_unique;
        """
    )
