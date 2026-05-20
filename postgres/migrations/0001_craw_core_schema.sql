create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_plan_check check (plan in ('free', 'solo', 'studio'))
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  status text not null default 'active',
  invited_by uuid,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('owner', 'admin', 'member', 'viewer')),
  constraint workspace_members_status_check check (status in ('invited', 'active', 'disabled')),
  constraint workspace_members_unique_user unique (organization_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
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
  constraint projects_widget_button_position_check check (
    widget_button_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left')
  ),
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
  constraint project_public_keys_status_check check (status in ('active', 'retired')),
  constraint project_public_keys_retired_at_check check (
    (status = 'retired' and retired_at is not null)
    or (status = 'active' and retired_at is null)
  )
);

create table if not exists provider_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
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
  constraint provider_integrations_status_check check (status in ('connected', 'needs_setup', 'needs_reconnect', 'disabled')),
  constraint provider_integrations_external_account_id_check check (
    external_account_id is null or length(trim(external_account_id)) > 0
  ),
  constraint provider_integrations_installation_id_check check (
    installation_id is null or length(trim(installation_id)) > 0
  ),
  constraint provider_integrations_base_url_check check (
    base_url is null or length(trim(base_url)) > 0
  )
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
  algorithm text not null default 'aes-256-gcm',
  ciphertext text,
  iv text,
  tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_integration_credentials_kind_check check (
    credential_kind in (
      'github_app_installation',
      'oauth_token',
      'oauth_refresh_token',
      'project_token',
      'personal_token',
      'webhook_secret'
    )
  ),
  constraint provider_integration_credentials_status_check check (
    status in ('active', 'expired', 'revoked', 'needs_rotation')
  ),
  constraint provider_integration_credentials_storage_reference_check check (length(storage_reference) > 0),
  constraint provider_integration_credentials_algorithm_check check (algorithm = 'aes-256-gcm'),
  constraint provider_integration_credentials_secret_material_check check (
    (ciphertext is null and iv is null and tag is null)
    or (length(ciphertext) > 0 and length(iv) > 0 and length(tag) > 0)
  ),
  constraint provider_integration_credentials_unique unique (integration_id, credential_kind, storage_reference)
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
  issue_target_id uuid not null references issue_targets(id) on delete restrict,
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
  screenshot_path text,
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
  constraint feedbacks_status_check check (
    status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'kept', 'resolved', 'ignored')
  ),
  constraint feedbacks_type_check check (type in ('comment', 'pin', 'screenshot')),
  constraint feedbacks_viewport_width_check check (viewport_width is null or viewport_width > 0),
  constraint feedbacks_viewport_height_check check (viewport_height is null or viewport_height > 0),
  constraint feedbacks_device_pixel_ratio_check check (device_pixel_ratio is null or device_pixel_ratio > 0),
  constraint feedbacks_screenshot_bytes_check check (screenshot_bytes is null or screenshot_bytes >= 0),
  constraint feedbacks_screenshot_original_bytes_check check (screenshot_original_bytes is null or screenshot_original_bytes >= 0),
  constraint feedbacks_screenshot_usage_count_check check (screenshot_usage_count >= 0),
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
  created_at timestamptz not null default now(),
  constraint feedback_status_events_from_status_check check (
    from_status is null
    or from_status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'kept', 'resolved', 'ignored')
  ),
  constraint feedback_status_events_to_status_check check (
    to_status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'kept', 'resolved', 'ignored')
  ),
  constraint feedback_status_events_provider_check check (provider is null or provider in ('github', 'gitlab'))
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
  constraint provider_issue_attempts_provider_check check (provider in ('github', 'gitlab')),
  constraint provider_issue_attempts_status_check check (status in ('pending', 'retrying', 'succeeded', 'failed')),
  constraint provider_issue_attempts_retry_count_check check (retry_count >= 0),
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
  updated_at timestamptz not null default now(),
  constraint external_issues_provider_check check (provider in ('github', 'gitlab')),
  constraint external_issues_state_check check (state in ('open', 'closed'))
);

create table if not exists public_launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'homepage',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_launch_waitlist_email_check check (
    length(email) between 3 and 254
    and email = lower(email)
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint public_launch_waitlist_source_check check (
    length(trim(source)) between 1 and 80
  ),
  constraint public_launch_waitlist_status_check check (
    status in ('pending', 'invited', 'converted', 'unsubscribed')
  )
);

create unique index if not exists project_public_keys_one_active_per_project
  on project_public_keys (project_id)
  where status = 'active';

create index if not exists workspace_members_user_id_idx
  on workspace_members (user_id);

create index if not exists projects_organization_id_idx
  on projects (organization_id);

create index if not exists project_public_keys_project_id_idx
  on project_public_keys (project_id);

create index if not exists provider_integrations_organization_provider_status_idx
  on provider_integrations (organization_id, provider, status);

create index if not exists provider_integrations_provider_status_idx
  on provider_integrations (provider, status);

create unique index if not exists provider_integrations_github_installation_unique_idx
  on provider_integrations (organization_id, installation_id)
  where provider = 'github'
    and auth_type = 'github_app'
    and installation_id is not null
    and status <> 'disabled';

create unique index if not exists provider_integrations_oauth_account_unique_idx
  on provider_integrations (organization_id, provider, auth_type, external_account_id, coalesce(base_url, ''))
  where auth_type = 'oauth'
    and external_account_id is not null
    and status <> 'disabled';

create unique index if not exists provider_integrations_workspace_provider_slot_unique_idx
  on provider_integrations (organization_id, provider, auth_type)
  where external_account_id is null
    and installation_id is null
    and status <> 'disabled';

create index if not exists provider_integration_credentials_integration_id_idx
  on provider_integration_credentials (integration_id);

create unique index if not exists provider_integration_credentials_active_kind_idx
  on provider_integration_credentials (integration_id, credential_kind)
  where status = 'active';

create index if not exists issue_targets_integration_id_idx
  on issue_targets (integration_id);

create index if not exists feedbacks_project_status_created_at_idx
  on feedbacks (project_id, status, created_at desc);

create index if not exists feedbacks_project_created_at_idx
  on feedbacks (project_id, created_at desc);

create index if not exists feedback_status_events_feedback_created_at_idx
  on feedback_status_events (feedback_id, created_at desc);

create index if not exists provider_issue_attempts_feedback_created_at_idx
  on provider_issue_attempts (feedback_id, created_at desc);

create index if not exists feedbacks_screenshot_lifecycle_idx
  on feedbacks (screenshot_status, screenshot_last_used_at, screenshot_bytes)
  where screenshot_data_url is not null or screenshot_thumbnail_data_url is not null;

create index if not exists feedbacks_screenshot_archived_idx
  on feedbacks (screenshot_status, screenshot_archived_at)
  where screenshot_status = 'archived';

create unique index if not exists public_launch_waitlist_email_idx
  on public_launch_waitlist (email);

create index if not exists public_launch_waitlist_status_created_at_idx
  on public_launch_waitlist (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on organizations;
create trigger organizations_set_updated_at
  before update on organizations
  for each row
  execute function public.set_updated_at();

drop trigger if exists workspace_members_set_updated_at on workspace_members;
create trigger workspace_members_set_updated_at
  before update on workspace_members
  for each row
  execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at
  before update on projects
  for each row
  execute function public.set_updated_at();

drop trigger if exists provider_integrations_set_updated_at on provider_integrations;
create trigger provider_integrations_set_updated_at
  before update on provider_integrations
  for each row
  execute function public.set_updated_at();

drop trigger if exists provider_integration_credentials_set_updated_at on provider_integration_credentials;
create trigger provider_integration_credentials_set_updated_at
  before update on provider_integration_credentials
  for each row
  execute function public.set_updated_at();

drop trigger if exists feedbacks_set_updated_at on feedbacks;
create trigger feedbacks_set_updated_at
  before update on feedbacks
  for each row
  execute function public.set_updated_at();

drop trigger if exists provider_issue_attempts_set_updated_at on provider_issue_attempts;
create trigger provider_issue_attempts_set_updated_at
  before update on provider_issue_attempts
  for each row
  execute function public.set_updated_at();

drop trigger if exists external_issues_set_updated_at on external_issues;
create trigger external_issues_set_updated_at
  before update on external_issues
  for each row
  execute function public.set_updated_at();

drop trigger if exists public_launch_waitlist_set_updated_at on public_launch_waitlist;
create trigger public_launch_waitlist_set_updated_at
  before update on public_launch_waitlist
  for each row
  execute function public.set_updated_at();
