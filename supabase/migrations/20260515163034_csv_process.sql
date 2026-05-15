do $$ begin
  create type csv_import_status as enum ('RUNNING', 'COMPLETED', 'FAILED');
exception
  when duplicate_object then null;
end $$;

create table if not exists csv_import_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status csv_import_status not null default 'RUNNING',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_rows integer not null default 0 check (total_rows >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  message text
);

create table if not exists csv_import_errors (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references csv_import_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  student_id text,
  email text,
  error text not null,
  raw_row jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists csv_import_jobs_started_at_idx on csv_import_jobs(started_at desc);
create index if not exists csv_import_errors_job_id_idx on csv_import_errors(job_id);

alter table csv_import_jobs enable row level security;
alter table csv_import_errors enable row level security;
