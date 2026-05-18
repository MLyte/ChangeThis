alter table projects
  add column if not exists widget_reporter_fields text not null default 'optional';

update projects
set widget_reporter_fields = case
  when widget_reporter_fields in ('hidden', 'optional', 'required') then widget_reporter_fields
  else 'optional'
end
where widget_reporter_fields is null
  or widget_reporter_fields not in ('hidden', 'optional', 'required');

alter table projects
  alter column widget_reporter_fields set default 'optional',
  alter column widget_reporter_fields set not null;

alter table projects
  drop constraint if exists projects_widget_reporter_fields_check,
  add constraint projects_widget_reporter_fields_check check (
    widget_reporter_fields in ('hidden', 'optional', 'required')
  );
