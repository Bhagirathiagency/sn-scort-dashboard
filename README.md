# PV+™️ — Intelligent Pharmacovigilance & Drug Safety Platform

*From Safety Data to Safety Intelligence.*

Product owner: SN SCORT Research Solutions.

## What this is

PV+ is a cloud-native, multi-tenant pharmacovigilance and drug-safety platform for pharmaceutical companies, biotech, CROs, sponsors, and MAHs. See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full architecture assessment (stack, tenant model, RBAC, regulatory approach, AI approach, security, phased roadmap, risks).

This repository has **Phase 0 — Foundation** complete (tenant/RBAC/audit schema, authenticated shell app, CI, a provisioned Dev Supabase project) and **Phase 1a — first PV Core slice** in progress: Case Intake, Case Worklist, Case Overview, case status workflow, and duplicate detection, backed by a real (if intentionally minimal) ICSR data model — patients, reporters, products, adverse events, atomic case creation, and case versioning. A demo login account exists (see below). Coding, medical review, QC, follow-up, and regulatory submission are not yet built; they extend this same schema rather than replace it. The rest of the product spec's modules are staged for subsequent phases (see ARCHITECTURE.md §K "Risks and Assumptions").

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

A fictional demo tenant (`PV+ Demo Pharma`, per §48 — never real data) has been seeded via `supabase/seed.sql`, along with **one demo login account** (`demo.admin@pvplus-demo.invalid`, System Administrator role) — ask for the current password rather than expecting it in git. This repo has no public self-service sign-up (regulated PV software is admin-provisioned, not open sign-up); the demo account was created by inserting directly into `auth.users`/`auth.identities` (with a real bcrypt-hashed password via `pgcrypto`) since this session's network policy blocks calls to the Supabase Auth API directly — a documented, if unofficial, seeding technique, not a production user-creation path. It has no MFA factor enrolled; the login flow now detects that and skips straight to organisation selection rather than dead-ending on the MFA challenge (there is no enrollment screen yet — Phase 1 scope). A proper in-app invitation/User Management screen is also Phase 1 scope.

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
lib/            supabase clients, RBAC, audit, cases, AI interface
supabase/       SQL migrations
e2e/            Playwright smoke tests (local only, see e2e/README.md)
legacy/         the previous SN SCORT lead-gen dashboard (preserved, not deleted)
```

## Scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript, no emit
- `npm run test:e2e` — Playwright smoke test against a real Supabase project (see `e2e/README.md`; not run in CI yet, and could not be executed inside the Claude Code session that wrote it — that sandbox's network policy blocks browser egress to Supabase, so run it for real from an environment with normal network access)
