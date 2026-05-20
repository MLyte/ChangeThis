-- Combined ChangeThis production core migrations 0001-0008
-- Generated from supabase/migrations. Apply once in Supabase SQL Editor for changethis-prod.
-- Do not include 0009 here: public_launch_waitlist already appears present on production.


-- ===== 0001_initial_schema.sql =====
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  constraint organizations_plan_check check (plan in ('free', 'solo', 'studio'))
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  public_key text not null unique,
  allowed_origins text[] not null default '{}',
  created_at timestamptz not null default now()
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
  constraint provider_integrations_status_check check (status in ('connected', 'needs_reconnect', 'disabled'))
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
  created_at timestamptz not null default now(),
  constraint feedbacks_status_check check (status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'ignored')),
  constraint feedbacks_type_check check (type in ('comment', 'pin', 'screenshot')),
  constraint feedbacks_viewport_width_check check (viewport_width is null or viewport_width > 0),
  constraint feedbacks_viewport_height_check check (viewport_height is null or viewport_height > 0),
  constraint feedbacks_device_pixel_ratio_check check (device_pixel_ratio is null or device_pixel_ratio > 0)
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
  constraint feedback_status_events_from_status_check check (from_status is null or from_status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'ignored')),
  constraint feedback_status_events_to_status_check check (to_status in ('raw', 'issue_creation_pending', 'retrying', 'sent_to_provider', 'failed', 'ignored')),
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

alter table organizations enable row level security;
alter table projects enable row level security;
alter table provider_integrations enable row level security;
alter table issue_targets enable row level security;
alter table feedbacks enable row level security;
alter table external_issues enable row level security;
alter table feedback_status_events enable row level security;
alter table provider_issue_attempts enable row level security;

drop policy if exists "Organization owners can read their organizations" on organizations;
create policy "Organization owners can read their organizations"
  on organizations
  for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Organization owners can update their organizations" on organizations;
create policy "Organization owners can update their organizations"
  on organizations
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Organization owners can read projects" on projects;
create policy "Organization owners can read projects"
  on projects
  for select
  to authenticated
  using (
    exists (
      select 1
      from organizations
      where organizations.id = projects.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can manage projects" on projects;
create policy "Organization owners can manage projects"
  on projects
  for all
  to authenticated
  using (
    exists (
      select 1
      from organizations
      where organizations.id = projects.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organizations
      where organizations.id = projects.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read provider integrations" on provider_integrations;
create policy "Organization owners can read provider integrations"
  on provider_integrations
  for select
  to authenticated
  using (
    exists (
      select 1
      from organizations
      where organizations.id = provider_integrations.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can manage provider integrations" on provider_integrations;
create policy "Organization owners can manage provider integrations"
  on provider_integrations
  for all
  to authenticated
  using (
    exists (
      select 1
      from organizations
      where organizations.id = provider_integrations.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from organizations
      where organizations.id = provider_integrations.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read issue targets" on issue_targets;
create policy "Organization owners can read issue targets"
  on issue_targets
  for select
  to authenticated
  using (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = issue_targets.project_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can manage issue targets" on issue_targets;
create policy "Organization owners can manage issue targets"
  on issue_targets
  for all
  to authenticated
  using (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = issue_targets.project_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = issue_targets.project_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read feedbacks" on feedbacks;
create policy "Organization owners can read feedbacks"
  on feedbacks
  for select
  to authenticated
  using (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = feedbacks.project_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read external issues" on external_issues;
create policy "Organization owners can read external issues"
  on external_issues
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      join organizations on organizations.id = projects.organization_id
      where feedbacks.id = external_issues.feedback_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read feedback status events" on feedback_status_events;
create policy "Organization owners can read feedback status events"
  on feedback_status_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      join organizations on organizations.id = projects.organization_id
      where feedbacks.id = feedback_status_events.feedback_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can read provider issue attempts" on provider_issue_attempts;
create policy "Organization owners can read provider issue attempts"
  on provider_issue_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      join organizations on organizations.id = projects.organization_id
      where feedbacks.id = provider_issue_attempts.feedback_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can manage external issues" on external_issues;
create policy "Organization owners can manage external issues"
  on external_issues
  for all
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      join organizations on organizations.id = projects.organization_id
      where feedbacks.id = external_issues.feedback_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      join organizations on organizations.id = projects.organization_id
      where feedbacks.id = external_issues.feedback_id
        and organizations.owner_id = auth.uid()
    )
  );

drop policy if exists "Organization owners can manage feedbacks" on feedbacks;
create policy "Organization owners can manage feedbacks"
  on feedbacks
  for all
  to authenticated
  using (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = feedbacks.project_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from projects
      join organizations on organizations.id = projects.organization_id
      where projects.id = feedbacks.project_id
        and organizations.owner_id = auth.uid()
    )
  );


-- ===== 0002_require_single_issue_target_per_project.sql =====
alter table issue_targets
  drop constraint if exists issue_targets_project_provider_unique;

alter table issue_targets
  drop constraint if exists issue_targets_project_unique;

alter table issue_targets
  add constraint issue_targets_project_unique unique (project_id);

alter table feedbacks
  add column if not exists issue_target_id uuid references issue_targets(id) on delete restrict;


-- ===== 0003_membership_credentials_public_keys.sql =====
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

insert into workspace_members (organization_id, user_id, role, status, joined_at)
select id, owner_id, 'owner', 'active', created_at
from organizations
where owner_id is not null
on conflict (organization_id, user_id) do nothing;

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_integration_credentials_kind_check check (
    credential_kind in ('github_app_installation', 'oauth_token', 'project_token', 'personal_token', 'webhook_secret')
  ),
  constraint provider_integration_credentials_status_check check (
    status in ('active', 'expired', 'revoked', 'needs_rotation')
  ),
  constraint provider_integration_credentials_storage_reference_check check (length(storage_reference) > 0),
  constraint provider_integration_credentials_unique unique (integration_id, credential_kind, storage_reference)
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

insert into project_public_keys (project_id, public_key, status, activated_at)
select id, public_key, 'active', created_at
from projects
on conflict (public_key) do nothing;

create unique index if not exists project_public_keys_one_active_per_project
  on project_public_keys (project_id)
  where status = 'active';

create index if not exists workspace_members_user_id_idx
  on workspace_members (user_id);

create index if not exists provider_integration_credentials_integration_id_idx
  on provider_integration_credentials (integration_id);

create index if not exists project_public_keys_project_id_idx
  on project_public_keys (project_id);

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organizations
    where organizations.id = target_organization_id
      and organizations.owner_id = auth.uid()
  )
  or exists (
    select 1
    from workspace_members
    where workspace_members.organization_id = target_organization_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.status = 'active'
  );
$$;

create or replace function public.can_manage_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organizations
    where organizations.id = target_organization_id
      and organizations.owner_id = auth.uid()
  )
  or exists (
    select 1
    from workspace_members
    where workspace_members.organization_id = target_organization_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.status = 'active'
      and workspace_members.role in ('owner', 'admin')
  );
$$;

revoke execute on function public.is_organization_member(uuid) from public;
revoke execute on function public.is_organization_member(uuid) from anon;
revoke execute on function public.is_organization_member(uuid) from authenticated;

revoke execute on function public.can_manage_organization(uuid) from public;
revoke execute on function public.can_manage_organization(uuid) from anon;
revoke execute on function public.can_manage_organization(uuid) from authenticated;

alter table workspace_members enable row level security;
alter table provider_integration_credentials enable row level security;
alter table project_public_keys enable row level security;

drop policy if exists "Organization members can read their organizations" on organizations;
create policy "Organization members can read their organizations"
  on organizations
  for select
  to authenticated
  using (public.is_organization_member(id));

drop policy if exists "Organization admins can update their organizations" on organizations;
create policy "Organization admins can update their organizations"
  on organizations
  for update
  to authenticated
  using (public.can_manage_organization(id))
  with check (public.can_manage_organization(id));

drop policy if exists "Organization members can read workspace members" on workspace_members;
create policy "Organization members can read workspace members"
  on workspace_members
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Organization admins can manage workspace members" on workspace_members;
create policy "Organization admins can manage workspace members"
  on workspace_members
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

drop policy if exists "Organization members can read projects" on projects;
create policy "Organization members can read projects"
  on projects
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

drop policy if exists "Organization admins can manage projects" on projects;
create policy "Organization admins can manage projects"
  on projects
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

drop policy if exists "Organization admins can read provider integrations" on provider_integrations;
create policy "Organization admins can read provider integrations"
  on provider_integrations
  for select
  to authenticated
  using (public.can_manage_organization(organization_id));

drop policy if exists "Organization admins can manage provider integrations" on provider_integrations;
create policy "Organization admins can manage provider integrations"
  on provider_integrations
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

drop policy if exists "Organization admins can read provider credential metadata" on provider_integration_credentials;
create policy "Organization admins can read provider credential metadata"
  on provider_integration_credentials
  for select
  to authenticated
  using (
    exists (
      select 1
      from provider_integrations
      where provider_integrations.id = provider_integration_credentials.integration_id
        and public.can_manage_organization(provider_integrations.organization_id)
    )
  );

drop policy if exists "Organization admins can manage provider credential metadata" on provider_integration_credentials;
create policy "Organization admins can manage provider credential metadata"
  on provider_integration_credentials
  for all
  to authenticated
  using (
    exists (
      select 1
      from provider_integrations
      where provider_integrations.id = provider_integration_credentials.integration_id
        and public.can_manage_organization(provider_integrations.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from provider_integrations
      where provider_integrations.id = provider_integration_credentials.integration_id
        and public.can_manage_organization(provider_integrations.organization_id)
    )
  );

drop policy if exists "Organization members can read issue targets" on issue_targets;
create policy "Organization members can read issue targets"
  on issue_targets
  for select
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = issue_targets.project_id
        and public.is_organization_member(projects.organization_id)
    )
  );

drop policy if exists "Organization admins can manage issue targets" on issue_targets;
create policy "Organization admins can manage issue targets"
  on issue_targets
  for all
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = issue_targets.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from projects
      where projects.id = issue_targets.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  );

drop policy if exists "Organization members can read project public keys" on project_public_keys;
create policy "Organization members can read project public keys"
  on project_public_keys
  for select
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = project_public_keys.project_id
        and public.is_organization_member(projects.organization_id)
    )
  );

drop policy if exists "Organization admins can manage project public keys" on project_public_keys;
create policy "Organization admins can manage project public keys"
  on project_public_keys
  for all
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = project_public_keys.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from projects
      where projects.id = project_public_keys.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  );

drop policy if exists "Organization members can read feedbacks" on feedbacks;
create policy "Organization members can read feedbacks"
  on feedbacks
  for select
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = feedbacks.project_id
        and public.is_organization_member(projects.organization_id)
    )
  );

drop policy if exists "Organization admins can manage feedbacks" on feedbacks;
create policy "Organization admins can manage feedbacks"
  on feedbacks
  for all
  to authenticated
  using (
    exists (
      select 1
      from projects
      where projects.id = feedbacks.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from projects
      where projects.id = feedbacks.project_id
        and public.can_manage_organization(projects.organization_id)
    )
  );

drop policy if exists "Organization members can read external issues" on external_issues;
create policy "Organization members can read external issues"
  on external_issues
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      where feedbacks.id = external_issues.feedback_id
        and public.is_organization_member(projects.organization_id)
    )
  );

drop policy if exists "Organization admins can manage external issues" on external_issues;
create policy "Organization admins can manage external issues"
  on external_issues
  for all
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      where feedbacks.id = external_issues.feedback_id
        and public.can_manage_organization(projects.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      where feedbacks.id = external_issues.feedback_id
        and public.can_manage_organization(projects.organization_id)
    )
  );

drop policy if exists "Organization members can read feedback status events" on feedback_status_events;
create policy "Organization members can read feedback status events"
  on feedback_status_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      where feedbacks.id = feedback_status_events.feedback_id
        and public.is_organization_member(projects.organization_id)
    )
  );

drop policy if exists "Organization members can read provider issue attempts" on provider_issue_attempts;
create policy "Organization members can read provider issue attempts"
  on provider_issue_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
      from feedbacks
      join projects on projects.id = feedbacks.project_id
      where feedbacks.id = provider_issue_attempts.feedback_id
        and public.is_organization_member(projects.organization_id)
    )
  );


-- ===== 0004_feedback_resolution_statuses.sql =====
alter table feedbacks
  drop constraint if exists feedbacks_status_check;

alter table feedbacks
  add constraint feedbacks_status_check check (
    status in (
      'raw',
      'issue_creation_pending',
      'retrying',
      'sent_to_provider',
      'failed',
      'kept',
      'resolved',
      'ignored'
    )
  );


-- ===== 0005_project_widget_settings.sql =====
alter table projects
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists widget_locale text not null default 'fr',
  add column if not exists widget_button_position text not null default 'bottom-right',
  add column if not exists widget_button_variant text not null default 'default';

update projects
set
  updated_at = coalesce(updated_at, created_at, now()),
  widget_locale = case when widget_locale in ('fr', 'en') then widget_locale else 'fr' end,
  widget_button_position = case
    when widget_button_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left') then widget_button_position
    else 'bottom-right'
  end,
  widget_button_variant = case when widget_button_variant in ('default', 'subtle') then widget_button_variant else 'default' end
where updated_at is null
  or widget_locale is null
  or widget_locale not in ('fr', 'en')
  or widget_button_position is null
  or widget_button_position not in ('bottom-right', 'bottom-left', 'top-right', 'top-left')
  or widget_button_variant is null
  or widget_button_variant not in ('default', 'subtle');

alter table projects
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column widget_locale set default 'fr',
  alter column widget_locale set not null,
  alter column widget_button_position set default 'bottom-right',
  alter column widget_button_position set not null,
  alter column widget_button_variant set default 'default',
  alter column widget_button_variant set not null;

alter table projects
  drop constraint if exists projects_widget_locale_check,
  drop constraint if exists projects_widget_button_position_check,
  drop constraint if exists projects_widget_button_variant_check,
  add constraint projects_widget_locale_check check (widget_locale in ('fr', 'en')),
  add constraint projects_widget_button_position_check check (
    widget_button_position in ('bottom-right', 'bottom-left', 'top-right', 'top-left')
  ),
  add constraint projects_widget_button_variant_check check (widget_button_variant in ('default', 'subtle'));

create index if not exists projects_organization_id_idx
  on projects (organization_id);

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on projects;

create trigger projects_set_updated_at
  before update on projects
  for each row
  execute function public.set_projects_updated_at();


-- ===== 0006_feedback_repository_model_columns.sql =====
alter table feedbacks
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists payload jsonb,
  add column if not exists issue_draft_title text,
  add column if not exists issue_draft_description text,
  add column if not exists issue_draft_labels text[] not null default '{}',
  add column if not exists screenshot_data_url text,
  add column if not exists screenshot_mime_type text,
  add column if not exists screenshot_bytes integer;

update feedbacks
set
  updated_at = coalesce(updated_at, created_at, now()),
  issue_draft_labels = coalesce(issue_draft_labels, '{}')
where updated_at is null
  or issue_draft_labels is null;

alter table feedbacks
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column issue_draft_labels set default '{}',
  alter column issue_draft_labels set not null,
  drop constraint if exists feedbacks_screenshot_bytes_check,
  add constraint feedbacks_screenshot_bytes_check check (screenshot_bytes is null or screenshot_bytes >= 0);

alter table feedback_status_events
  drop constraint if exists feedback_status_events_from_status_check,
  drop constraint if exists feedback_status_events_to_status_check,
  add constraint feedback_status_events_from_status_check check (
    from_status is null
    or from_status in (
      'raw',
      'issue_creation_pending',
      'retrying',
      'sent_to_provider',
      'failed',
      'kept',
      'resolved',
      'ignored'
    )
  ),
  add constraint feedback_status_events_to_status_check check (
    to_status in (
      'raw',
      'issue_creation_pending',
      'retrying',
      'sent_to_provider',
      'failed',
      'kept',
      'resolved',
      'ignored'
    )
  );

create or replace function public.set_feedbacks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedbacks_set_updated_at on feedbacks;

create trigger feedbacks_set_updated_at
  before update on feedbacks
  for each row
  execute function public.set_feedbacks_updated_at();


-- ===== 0007_provider_integrations_workspace_storage.sql =====
alter table provider_integrations
  drop constraint if exists provider_integrations_status_check,
  add constraint provider_integrations_status_check check (
    status in ('connected', 'needs_setup', 'needs_reconnect', 'disabled')
  ),
  drop constraint if exists provider_integrations_external_account_id_check,
  add constraint provider_integrations_external_account_id_check check (
    external_account_id is null or length(trim(external_account_id)) > 0
  ),
  drop constraint if exists provider_integrations_installation_id_check,
  add constraint provider_integrations_installation_id_check check (
    installation_id is null or length(trim(installation_id)) > 0
  ),
  drop constraint if exists provider_integrations_base_url_check,
  add constraint provider_integrations_base_url_check check (
    base_url is null or length(trim(base_url)) > 0
  );

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

create index if not exists issue_targets_integration_id_idx
  on issue_targets (integration_id);

alter table provider_integration_credentials
  add column if not exists ciphertext text,
  add column if not exists iv text,
  add column if not exists tag text,
  add column if not exists algorithm text not null default 'aes-256-gcm',
  drop constraint if exists provider_integration_credentials_kind_check,
  add constraint provider_integration_credentials_kind_check check (
    credential_kind in (
      'github_app_installation',
      'oauth_token',
      'oauth_refresh_token',
      'project_token',
      'personal_token',
      'webhook_secret'
    )
  ),
  drop constraint if exists provider_integration_credentials_algorithm_check,
  add constraint provider_integration_credentials_algorithm_check check (algorithm = 'aes-256-gcm'),
  drop constraint if exists provider_integration_credentials_secret_material_check,
  add constraint provider_integration_credentials_secret_material_check check (
    (ciphertext is null and iv is null and tag is null)
    or (length(ciphertext) > 0 and length(iv) > 0 and length(tag) > 0)
  );

create unique index if not exists provider_integration_credentials_active_kind_idx
  on provider_integration_credentials (integration_id, credential_kind)
  where status = 'active';

create or replace function public.set_provider_integrations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists provider_integrations_set_updated_at on provider_integrations;

create trigger provider_integrations_set_updated_at
  before update on provider_integrations
  for each row
  execute function public.set_provider_integrations_updated_at();


-- ===== 0008_feedback_operational_indexes.sql =====
create index if not exists feedbacks_project_status_created_at_idx
  on feedbacks (project_id, status, created_at desc);

create index if not exists feedbacks_project_created_at_idx
  on feedbacks (project_id, created_at desc);

create index if not exists feedback_status_events_feedback_created_at_idx
  on feedback_status_events (feedback_id, created_at desc);

create index if not exists provider_issue_attempts_feedback_created_at_idx
  on provider_issue_attempts (feedback_id, created_at desc);

