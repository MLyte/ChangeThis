create table if not exists public_launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'homepage',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_launch_waitlist_email_check check (
    length(email) between 3 and 254
    and email = lower(email)
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint public_launch_waitlist_source_check check (
    length(trim(source)) between 1 and 80
  ),
  constraint public_launch_waitlist_status_check check (
    status in ('pending', 'invited', 'converted', 'unsubscribed')
  )
);

create unique index if not exists public_launch_waitlist_email_idx
  on public_launch_waitlist (email);

create index if not exists public_launch_waitlist_status_created_at_idx
  on public_launch_waitlist (status, created_at desc);

create or replace function public.set_public_launch_waitlist_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists public_launch_waitlist_set_updated_at on public_launch_waitlist;

create trigger public_launch_waitlist_set_updated_at
  before update on public_launch_waitlist
  for each row
  execute function public.set_public_launch_waitlist_updated_at();
