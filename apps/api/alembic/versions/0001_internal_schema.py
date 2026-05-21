"""Create internal ChangeThis schema.

Revision ID: 0001_internal_schema
Revises:
Create Date: 2026-05-21
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001_internal_schema"
down_revision: str | None = None
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
        create extension if not exists pgcrypto;

        create table if not exists users (
          id uuid primary key default gen_random_uuid(),
          email text not null unique,
          password_hash text not null,
          display_name text,
          status text not null default 'active',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint users_status_check check (status in ('active', 'disabled'))
        );

        create table if not exists workspaces (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          owner_id uuid references users(id) on delete set null,
          plan text not null default 'free',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint workspaces_plan_check check (plan in ('free', 'solo', 'studio'))
        );

        create table if not exists memberships (
          id uuid primary key default gen_random_uuid(),
          workspace_id uuid not null references workspaces(id) on delete cascade,
          user_id uuid not null references users(id) on delete cascade,
          role text not null default 'member',
          status text not null default 'active',
          invited_by uuid references users(id) on delete set null,
          invited_at timestamptz,
          joined_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint memberships_role_check check (role in ('owner', 'admin', 'member', 'viewer')),
          constraint memberships_status_check check (status in ('invited', 'active', 'disabled')),
          constraint memberships_workspace_user_unique unique (workspace_id, user_id)
        );

        create table if not exists sessions (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references users(id) on delete cascade,
          token_hash text not null unique,
          expires_at timestamptz not null,
          revoked_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create table if not exists projects (
          id uuid primary key default gen_random_uuid(),
          workspace_id uuid not null references workspaces(id) on delete cascade,
          name text not null,
          public_key text not null unique,
          allowed_origins text[] not null default '{}',
          widget_locale text not null default 'fr',
          widget_button_position text not null default 'bottom-right',
          widget_button_variant text not null default 'default',
          widget_reporter_fields text not null default 'optional',
          issue_creation_mode text not null default 'manual',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint projects_widget_locale_check check (widget_locale in ('fr', 'en')),
          constraint projects_widget_button_position_check check (widget_button_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
          constraint projects_widget_button_variant_check check (widget_button_variant in ('default', 'subtle')),
          constraint projects_widget_reporter_fields_check check (widget_reporter_fields in ('hidden', 'optional', 'required')),
          constraint projects_issue_creation_mode_check check (issue_creation_mode in ('manual', 'automatic'))
        );

        create table if not exists project_public_keys (
          id uuid primary key default gen_random_uuid(),
          project_id uuid not null references projects(id) on delete cascade,
          public_key text not null unique,
          status text not null default 'active',
          rotated_from_key_id uuid references project_public_keys(id) on delete set null,
          created_at timestamptz not null default now(),
          activated_at timestamptz not null default now(),
          retired_at timestamptz,
          constraint project_public_keys_status_check check (status in ('active', 'retired'))
        );

        create table if not exists provider_integrations (
          id uuid primary key default gen_random_uuid(),
          workspace_id uuid not null references workspaces(id) on delete cascade,
          provider text not null,
          auth_type text not null,
          external_account_id text,
          installation_id text,
          base_url text,
          status text not null default 'connected',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint provider_integrations_provider_check check (provider in ('github', 'gitlab')),
          constraint provider_integrations_auth_type_check check (auth_type in ('github_app', 'oauth', 'project_token', 'personal_token')),
          constraint provider_integrations_status_check check (status in ('connected', 'needs_setup', 'needs_reconnect', 'disabled'))
        );

        create table if not exists provider_integration_credentials (
          id uuid primary key default gen_random_uuid(),
          integration_id uuid not null references provider_integrations(id) on delete cascade,
          credential_kind text not null,
          storage_reference text not null,
          display_name text,
          scopes text[] not null default '{}',
          fingerprint_sha256 text,
          expires_at timestamptz,
          last_validated_at timestamptz,
          rotated_at timestamptz,
          status text not null default 'active',
          ciphertext text,
          iv text,
          tag text,
          algorithm text not null default 'aes-256-gcm',
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint provider_integration_credentials_status_check check (status in ('active', 'expired', 'revoked', 'needs_rotation')),
          constraint provider_integration_credentials_algorithm_check check (algorithm = 'aes-256-gcm')
        );

        create table if not exists issue_targets (
          id uuid primary key default gen_random_uuid(),
          project_id uuid not null references projects(id) on delete cascade,
          integration_id uuid references provider_integrations(id) on delete set null,
          provider text not null,
          namespace text not null,
          project_name text not null,
          external_project_id text,
          web_url text,
          created_at timestamptz not null default now(),
          constraint issue_targets_provider_check check (provider in ('github', 'gitlab')),
          constraint issue_targets_project_unique unique (project_id)
        );

        create table if not exists feedbacks (
          id uuid primary key default gen_random_uuid(),
          project_id uuid not null references projects(id) on delete cascade,
          issue_target_id uuid references issue_targets(id) on delete set null,
          status text not null default 'raw',
          type text not null,
          message text not null default '',
          page_url text not null,
          page_title text,
          browser text,
          viewport_width integer,
          viewport_height integer,
          device_pixel_ratio numeric,
          pin_x integer,
          pin_y integer,
          element_selector text,
          element_text text,
          payload jsonb,
          issue_draft_title text,
          issue_draft_description text,
          issue_draft_labels text[] not null default '{}',
          screenshot_data_url text,
          screenshot_thumbnail_data_url text,
          screenshot_mime_type text,
          screenshot_bytes integer,
          screenshot_original_bytes integer,
          screenshot_hash text,
          screenshot_status text not null default 'active',
          screenshot_storage_path text,
          screenshot_last_used_at timestamptz,
          screenshot_usage_count integer not null default 0,
          screenshot_archived_at timestamptz,
          screenshot_deleted_at timestamptz,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint feedbacks_status_check check (status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'kept', 'resolved', 'ignored')),
          constraint feedbacks_type_check check (type in ('comment', 'pin', 'screenshot')),
          constraint feedbacks_screenshot_status_check check (screenshot_status in ('active', 'archived', 'deleted'))
        );

        create table if not exists feedback_status_events (
          id uuid primary key default gen_random_uuid(),
          feedback_id uuid not null references feedbacks(id) on delete cascade,
          from_status text,
          to_status text not null,
          reason text,
          provider text,
          external_url text,
          created_at timestamptz not null default now()
        );

        create table if not exists provider_issue_attempts (
          id uuid primary key default gen_random_uuid(),
          feedback_id uuid not null references feedbacks(id) on delete cascade,
          provider text not null,
          idempotency_key text not null,
          status text not null default 'pending',
          retry_count integer not null default 0,
          next_retry_at timestamptz,
          last_error text,
          raw_payload jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          constraint provider_issue_attempts_idempotency_unique unique (provider, idempotency_key)
        );

        create table if not exists external_issues (
          id uuid primary key default gen_random_uuid(),
          feedback_id uuid not null unique references feedbacks(id) on delete cascade,
          issue_target_id uuid references issue_targets(id) on delete set null,
          provider text not null,
          external_id text,
          external_iid integer,
          external_number integer,
          url text not null,
          state text not null default 'open',
          raw_payload jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        );

        create index if not exists memberships_user_id_idx on memberships (user_id);
        create index if not exists projects_workspace_id_idx on projects (workspace_id);
        create index if not exists project_public_keys_project_id_idx on project_public_keys (project_id);
        create unique index if not exists project_public_keys_one_active_per_project on project_public_keys (project_id) where status = 'active';
        create index if not exists provider_integrations_workspace_provider_status_idx on provider_integrations (workspace_id, provider, status);
        create index if not exists issue_targets_integration_id_idx on issue_targets (integration_id);
        create index if not exists feedbacks_project_status_created_at_idx on feedbacks (project_id, status, created_at desc);
        create index if not exists feedbacks_project_created_at_idx on feedbacks (project_id, created_at desc);
        create index if not exists feedback_status_events_feedback_created_at_idx on feedback_status_events (feedback_id, created_at desc);
        create index if not exists provider_issue_attempts_feedback_created_at_idx on provider_issue_attempts (feedback_id, created_at desc);
        """
    )


def downgrade() -> None:
    _execute_statements(
        """
        drop table if exists external_issues;
        drop table if exists provider_issue_attempts;
        drop table if exists feedback_status_events;
        drop table if exists feedbacks;
        drop table if exists issue_targets;
        drop table if exists provider_integration_credentials;
        drop table if exists provider_integrations;
        drop table if exists project_public_keys;
        drop table if exists projects;
        drop table if exists sessions;
        drop table if exists memberships;
        drop table if exists workspaces;
        drop table if exists users;
        """
    )
