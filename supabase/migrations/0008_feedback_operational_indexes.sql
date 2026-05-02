create index if not exists feedbacks_project_status_created_at_idx
  on feedbacks (project_id, status, created_at desc);

create index if not exists feedbacks_project_created_at_idx
  on feedbacks (project_id, created_at desc);

create index if not exists feedback_status_events_feedback_created_at_idx
  on feedback_status_events (feedback_id, created_at desc);

create index if not exists provider_issue_attempts_feedback_created_at_idx
  on provider_issue_attempts (feedback_id, created_at desc);
