with generated_workshops as (
  select
    n,
    ('33333333-3333-3333-3333-' || lpad((400 + n)::text, 12, '0'))::uuid as id,
    (array[
      'Cloud Cost Control Lab',
      'Secure API Design Clinic',
      'Prompt Engineering Studio',
      'PostgreSQL Performance Workshop',
      'React UX Systems Practicum',
      'Queue-Driven Architecture Lab',
      'Observability for Student Apps',
      'Mobile Offline Sync Workshop',
      'Payment Reliability Drills',
      'AI-Assisted Research Tools'
    ])[((n - 1) % 10) + 1] || ' #' || n as title,
    (array[
      'Dr. Hien Vu',
      'Ms. Phuong Tran',
      'Prof. Dat Nguyen',
      'Mr. Bao Le',
      'Dr. My Pham',
      'Ms. Linh Do',
      'Mr. Nam Ho',
      'Prof. An Vo'
    ])[((n - 1) % 8) + 1] as speaker,
    case (n - 1) % 4
      when 0 then '22222222-2222-2222-2222-222222222221'::uuid
      when 1 then '22222222-2222-2222-2222-222222222222'::uuid
      when 2 then '22222222-2222-2222-2222-222222222223'::uuid
      else '22222222-2222-2222-2222-222222222224'::uuid
    end as room_id,
    case (n - 1) % 5
      when 0 then 40
      when 1 then 60
      when 2 then 80
      when 3 then 120
      else 160
    end as capacity,
    case (n - 1) % 6
      when 0 then 0.00
      when 1 then 25000.00
      when 2 then 50000.00
      when 3 then 75000.00
      when 4 then 100000.00
      else 150000.00
    end as price,
    timestamp with time zone '2026-06-17 09:00:00+07'
      + ((n - 1) * interval '1 day')
      + (((n - 1) % 4) * interval '90 minutes') as start_time,
    case
      when n % 3 = 0 then 'https://example.com/unihub/test-workshop-' || n || '.pdf'
      else null
    end as pdf_url,
    'Seed workshop #' || n || ' for testing browsing, sorting, registration resilience, admin metrics, and responsive list layouts.' as ai_summary
  from generate_series(1, 50) as series(n)
),
workshops_with_seats as (
  select
    *,
    greatest(0, capacity - ((n * 7) % (capacity + 1))) as seats_remaining
  from generated_workshops
)
insert into workshops (
  id,
  title,
  speaker,
  room_id,
  capacity,
  seats_remaining,
  price,
  start_time,
  pdf_url,
  ai_summary
)
select
  id,
  title,
  speaker,
  room_id,
  capacity,
  seats_remaining,
  price,
  start_time,
  pdf_url,
  ai_summary
from workshops_with_seats
on conflict (id) do update
set
  title = excluded.title,
  speaker = excluded.speaker,
  room_id = excluded.room_id,
  capacity = excluded.capacity,
  seats_remaining = excluded.seats_remaining,
  price = excluded.price,
  start_time = excluded.start_time,
  pdf_url = excluded.pdf_url,
  ai_summary = excluded.ai_summary,
  updated_at = now();
