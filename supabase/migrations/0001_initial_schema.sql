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
  github_repo_owner text,
  github_repo_name text,
  github_installation_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
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
  github_issue_number integer,
  github_issue_url text,
  created_at timestamptz not null default now(),
  constraint feedbacks_status_check check (status in ('raw', 'sent_to_github', 'failed')),
  constraint feedbacks_type_check check (type in ('comment', 'pin', 'screenshot')),
  constraint feedbacks_viewport_width_check check (viewport_width is null or viewport_width > 0),
  constraint feedbacks_viewport_height_check check (viewport_height is null or viewport_height > 0),
  constraint feedbacks_device_pixel_ratio_check check (device_pixel_ratio is null or device_pixel_ratio > 0)
);

alter table organizations enable row level security;
alter table projects enable row level security;
alter table feedbacks enable row level security;

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
