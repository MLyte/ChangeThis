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

alter table workspace_members enable row level security;
alter table provider_integration_credentials enable row level security;
alter table project_public_keys enable row level security;

create policy "Organization members can read their organizations"
  on organizations
  for select
  to authenticated
  using (public.is_organization_member(id));

create policy "Organization admins can update their organizations"
  on organizations
  for update
  to authenticated
  using (public.can_manage_organization(id))
  with check (public.can_manage_organization(id));

create policy "Organization members can read workspace members"
  on workspace_members
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

create policy "Organization admins can manage workspace members"
  on workspace_members
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

create policy "Organization members can read projects"
  on projects
  for select
  to authenticated
  using (public.is_organization_member(organization_id));

create policy "Organization admins can manage projects"
  on projects
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

create policy "Organization admins can read provider integrations"
  on provider_integrations
  for select
  to authenticated
  using (public.can_manage_organization(organization_id));

create policy "Organization admins can manage provider integrations"
  on provider_integrations
  for all
  to authenticated
  using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

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
