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
