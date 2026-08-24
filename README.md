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

A Supabase project is required for auth/database to function locally — none is provisioned yet in this repository. To stand one up:

1. Create a Supabase project (Development environment first).
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
