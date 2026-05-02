alter table feedbacks
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists payload jsonb,
  add column if not exists issue_draft_title text,
  add column if not exists issue_draft_description text,
  add column if not exists issue_draft_labels text[] not null default '{}',
  add column if not exists screenshot_data_url text,
  add column if not exists screenshot_mime_type text,
  add column if not exists screenshot_bytes integer;

update feedbacks
set
  updated_at = coalesce(updated_at, created_at, now()),
  issue_draft_labels = coalesce(issue_draft_labels, '{}')
where updated_at is null
  or issue_draft_labels is null;

alter table feedbacks
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column issue_draft_labels set default '{}',
  alter column issue_draft_labels set not null,
  drop constraint if exists feedbacks_screenshot_bytes_check,
  add constraint feedbacks_screenshot_bytes_check check (screenshot_bytes is null or screenshot_bytes >= 0);

alter table feedback_status_events
  drop constraint if exists feedback_status_events_from_status_check,
  drop constraint if exists feedback_status_events_to_status_check,
  add constraint feedback_status_events_from_status_check check (
    from_status is null
    or from_status in (
      'raw',
      'issue_creation_pending',
      'retrying',
      'sent_to_provider',
      'failed',
      'kept',
      'resolved',
      'ignored'
    )
  ),
  add constraint feedback_status_events_to_status_check check (
    to_status in (
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

create or replace function public.set_feedbacks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feedbacks_set_updated_at on feedbacks;

create trigger feedbacks_set_updated_at
  before update on feedbacks
  for each row
  execute function public.set_feedbacks_updated_at();
