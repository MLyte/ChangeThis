-- DB migration
select * from alembic_version;

-- users & sessions
select * from users;
select * from sessions;
select * from workspaces;
select * from memberships;

-- projects
select * from projects;
-- listing des sites pour lesquels changethis est actif
select * from issue_targets;

-- accès user à d'autres workspace
select * from project_issue_members;
-- non utilisé, sert au renouvellement de la clé qui se trouve dans <script> widget à placer sur le site target
select * from project_public_keys;

-- provider (gitHub ou gitLab)
select * from provider_integrations;
-- stocke la clé API générée (cryptée) côté gitLab
select * from provider_integration_credentials;
-- insert issue dans gitLab
select * from provider_issue_attempts;

-- listing des feedback
select * from feedbacks;
-- workfow des feedback
select * from feedback_status_events;

select * from external_issues;


-- fait lors de la mise en place PG: keep users, memberships and alembic_version
TRUNCATE TABLE
  sessions,
  projects,
  project_public_keys,
  project_issue_members,
  provider_integrations,
  provider_integration_credentials,
  issue_targets,
  feedbacks,
  feedback_status_events,
  provider_issue_attempts,
  external_issues
CASCADE;