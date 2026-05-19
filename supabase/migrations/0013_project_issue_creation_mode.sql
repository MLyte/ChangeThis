alter table projects
  add column if not exists issue_creation_mode text not null default 'manual';

update projects
set issue_creation_mode = 'manual'
where issue_creation_mode is null
  or issue_creation_mode not in ('manual', 'automatic');

alter table projects
  alter column issue_creation_mode set default 'manual',
  alter column issue_creation_mode set not null;

alter table projects
  drop constraint if exists projects_issue_creation_mode_check,
  add constraint projects_issue_creation_mode_check
    check (issue_creation_mode in ('manual', 'automatic'));
