alter table feedbacks
  drop constraint if exists feedbacks_status_check;

alter table feedbacks
  add constraint feedbacks_status_check check (
    status in (
      'raw',
      'issue_creation_pending',
      'retrying',
      'sent_to_provider',
      'failed',
      'kept',
      'resolved',
      'ignored'
    )
  );
