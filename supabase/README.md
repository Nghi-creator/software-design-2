# Supabase database layout

`migrations/` contains schema changes only. Apply them in filename order:

1. `20260514000000_init_supabase.sql`
2. `20260515163034_csv_process.sql`
3. `20260517000000_room_layout_urls.sql`
4. `20260517090000_notifications.sql`
5. `20260517120000_notification_read_receipts.sql`

After the schema exists, run `seed.sql` once to load demo users, rooms, workshops, registrations, payments, and check-ins.

Why this split matters:

- Migrations should be safe to apply to an empty database without depending on demo rows.
- Seed data may depend on schema migrations and on other seed rows. For example, the generated workshop set references seeded room IDs, so it belongs in `seed.sql`, after rooms are inserted.
