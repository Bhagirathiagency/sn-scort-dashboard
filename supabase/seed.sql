-- PV+ demo/seed data — entirely fictional (§48). NOT part of the migration
-- ledger (kept out of supabase/migrations/) and never run against a
-- production project. Run manually against Development/Test projects only,
-- e.g. via the Supabase SQL editor or `supabase db execute -f seed.sql`.
--
-- This seeds a demo tenant only. Creating the first user account is a
-- separate step (Supabase Auth Admin, not plain SQL) — see README.md
-- "Getting started" for that flow; a proper in-app user invitation screen
-- is Phase 1 scope (User Management, §5).

insert into organizations (name, slug, org_type, subscription_tier)
values ('PV+ Demo Pharma', 'pv-demo-pharma', 'sponsor', 'professional')
on conflict (slug) do nothing;
