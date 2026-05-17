alter table notifications
  add column if not exists read_at timestamptz;

create index if not exists notifications_user_created_idx on notifications(user_id, created_at desc);
