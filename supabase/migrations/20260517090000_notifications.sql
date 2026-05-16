do $$ begin
  create type notification_channel as enum ('EMAIL');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type notification_status as enum ('PENDING', 'SENT', 'FAILED');
exception
  when duplicate_object then null;
end $$;

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  registration_id uuid references registrations(id),
  event_key text not null,
  channel notification_channel not null,
  subject text not null,
  body text not null,
  status notification_status not null default 'PENDING',
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_key, channel)
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_status_idx on notifications(status);

alter table notifications enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'users_can_read_own_notifications'
  ) then
    create policy users_can_read_own_notifications
      on notifications
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;
