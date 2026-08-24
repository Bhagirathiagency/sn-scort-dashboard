# PV+™️ — Intelligent Pharmacovigilance & Drug Safety Platform

*From Safety Data to Safety Intelligence.*

Product owner: SN SCORT Research Solutions.

## What this is

PV+ is a cloud-native, multi-tenant pharmacovigilance and drug-safety platform for pharmaceutical companies, biotech, CROs, sponsors, and MAHs. See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full architecture assessment (stack, tenant model, RBAC, regulatory approach, AI approach, security, phased roadmap, risks).

This repository is at **Phase 0 — Foundation**: tenant/RBAC/audit schema, authenticated shell app, CI. The full PV Core / Regulatory / Intelligence / Governance modules described in the product spec are staged for subsequent phases, each to be scoped and reviewed before build-out (see ARCHITECTURE.md §K "Risks and Assumptions").

## Regulatory disclaimer

PV+ is software that supports pharmacovigilance operations. It does not itself constitute or guarantee regulatory compliance. Compliance depends on customer procedures, intended use, configuration, validation, qualified personnel, jurisdiction, data quality, and ongoing operational controls.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in a Supabase project's URL + anon key
npm run dev
```

### Development environment (provisioned)

A **Development** Supabase project (`pv-plus-dev`, project ref `bfdrqujjeenkmgmvphax`, in the same Supabase organization as the account that ran this session) has been provisioned and has all of `supabase/migrations/` applied, including two follow-up hardening migrations added after the Supabase security advisor flagged the initial RLS helper functions (mutable `search_path`, `anon`-role execute access) — both fixed, verified clean by the advisor. Project URL: `https://bfdrqujjeenkmgmvphax.supabase.co`. Get the anon/publishable key from that project's API settings in the Supabase dashboard to fill in `.env.local`.

A fictional demo tenant (`PV+ Demo Pharma`, per §48 — never real data) has been seeded via `supabase/seed.sql`. **No user account exists yet**: this repo has no public self-service sign-up (regulated PV software is admin-provisioned, not open sign-up), so create the first user via Supabase Dashboard → Authentication → Users, then insert a matching row into the `users` table linking `auth_user_id` to the `organizations` row above. A proper in-app invitation/User Management screen is Phase 1 scope.

**Note:** this Supabase account already has one other, unrelated active project with live data (a lead-gen prospect list) — the PV+ migrations were deliberately applied to a brand-new project instead, to keep them isolated. Test/Validation/Production Supabase projects, per §32, are not yet provisioned — each is a separate step to take when the platform is ready to move past Phase 0/Development.

To provision a project yourself instead (e.g. a different organization/environment):

1. Create a Supabase project.
2. Run the migrations in `supabase/migrations/` in order (via `supabase db push` or the SQL editor).
3. Enable TOTP MFA in Supabase Auth settings.
4. Populate `.env.local` from the project's API settings.

## Environments

Per ARCHITECTURE.md §I / the product spec's §32, PV+ requires separate **Development / Test / Validation (UAT) / Production** environments — each its own Supabase project and deployment target, never sharing regulated data. Only Development exists as scaffolding today; the others are provisioned when the platform is ready to move past Phase 0.

## Project structure

```
app/            Next.js App Router — pages and API routes (/api/v1/*)
lib/            supabase clients, RBAC, audit, AI interface
supabase/       SQL migrations
legacy/         the previous SN SCORT lead-gen dashboard (preserved, not deleted)
```

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
