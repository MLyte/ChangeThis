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
