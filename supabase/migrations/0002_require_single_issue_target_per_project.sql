alter table issue_targets
  drop constraint if exists issue_targets_project_provider_unique;

alter table issue_targets
  drop constraint if exists issue_targets_project_unique;

alter table issue_targets
  add constraint issue_targets_project_unique unique (project_id);

alter table feedbacks
  add column if not exists issue_target_id uuid references issue_targets(id) on delete restrict;
