alter table feedbacks
  add column if not exists screenshot_thumbnail_data_url text,
  add column if not exists screenshot_original_bytes integer,
  add column if not exists screenshot_hash text,
  add column if not exists screenshot_status text not null default 'active',
  add column if not exists screenshot_storage_path text,
  add column if not exists screenshot_last_used_at timestamptz,
  add column if not exists screenshot_usage_count integer not null default 0,
  add column if not exists screenshot_archived_at timestamptz,
  add column if not exists screenshot_deleted_at timestamptz;

alter table feedbacks
  drop constraint if exists feedbacks_screenshot_original_bytes_check,
  add constraint feedbacks_screenshot_original_bytes_check check (screenshot_original_bytes is null or screenshot_original_bytes >= 0),
  drop constraint if exists feedbacks_screenshot_usage_count_check,
  add constraint feedbacks_screenshot_usage_count_check check (screenshot_usage_count >= 0),
  drop constraint if exists feedbacks_screenshot_status_check,
  add constraint feedbacks_screenshot_status_check check (screenshot_status in ('active', 'archived', 'deleted'));

update feedbacks
set
  screenshot_last_used_at = coalesce(screenshot_last_used_at, updated_at, created_at),
  screenshot_original_bytes = coalesce(screenshot_original_bytes, screenshot_bytes),
  screenshot_usage_count = case
    when screenshot_data_url is not null and screenshot_usage_count = 0 then 1
    else screenshot_usage_count
  end
where screenshot_data_url is not null;

create index if not exists feedbacks_screenshot_lifecycle_idx
  on feedbacks (screenshot_status, screenshot_last_used_at, screenshot_bytes)
  where screenshot_data_url is not null or screenshot_thumbnail_data_url is not null;

create index if not exists feedbacks_screenshot_archived_idx
  on feedbacks (screenshot_status, screenshot_archived_at)
  where screenshot_status = 'archived';
