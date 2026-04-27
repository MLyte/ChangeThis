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

create policy "Organization owners can read their organizations"
  on organizations
  for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Organization owners can update their organizations"
  on organizations
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

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
