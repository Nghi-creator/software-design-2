create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('STUDENT', 'ORGANIZER', 'CHECKIN_STAFF');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type registration_status as enum ('PENDING', 'CONFIRMED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum ('PENDING', 'SUCCESS', 'FAILED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type checkin_source as enum ('ONLINE', 'OFFLINE_SYNC');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type idempotency_status as enum ('IN_PROGRESS', 'COMPLETED');
exception
  when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role user_role not null default 'STUDENT',
  student_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  capacity integer not null check (capacity > 0)
);

create table if not exists workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text not null,
  room_id uuid not null references rooms(id),
  capacity integer not null check (capacity > 0),
  seats_remaining integer not null check (seats_remaining >= 0),
  price numeric(12, 2) not null default 0,
  start_time timestamptz not null,
  pdf_url text,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seats_remaining <= capacity)
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  workshop_id uuid not null references workshops(id),
  qr_code text not null unique,
  status registration_status not null default 'PENDING',
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workshop_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations(id),
  amount numeric(12, 2) not null,
  status payment_status not null default 'PENDING',
  transaction_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations(id),
  staff_id uuid not null references users(id),
  checkin_time timestamptz not null,
  source checkin_source not null
);

create table if not exists idempotency_keys (
  key text primary key,
  status idempotency_status not null default 'IN_PROGRESS',
  response text,
  status_code integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workshops_start_time_idx on workshops(start_time);
create index if not exists registrations_workshop_id_idx on registrations(workshop_id);
create index if not exists payments_idempotency_key_idx on payments(idempotency_key);
create index if not exists checkins_registration_id_idx on checkins(registration_id);
