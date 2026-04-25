create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  plan text not null default 'free',
  created_at timestamptz not null default now()
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
  created_at timestamptz not null default now()
);
