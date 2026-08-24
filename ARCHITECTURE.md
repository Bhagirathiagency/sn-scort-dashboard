# PV+™️ — Architecture Assessment

**Intelligent Pharmacovigilance & Drug Safety Platform**
*From Safety Data to Safety Intelligence.*

Product owner: SN SCORT Research Solutions.
This document is the deliverable requested by the PV+ Master Build Prompt, §50 ("First Development Task"): an architecture assessment to be reviewed before major irreversible build-out continues. Phase 0 scaffolding described here has been implemented on branch `claude/upbeat-sagan-bo0fkp`; everything beyond Phase 0 awaits explicit direction module-by-module.

---

## A. Existing Repository Analysis

This repository (`sn-scort-dashboard`) previously contained a **single static HTML file** — "SN SCORT — 90-Day Execution Board" — a lead-generation tracking dashboard for SN SCORT's own business operations (unrelated in content and domain to pharmacovigilance), deployed via GitHub Pages (`.github/workflows/static.yml`). There was no application framework, backend, database, authentication, or test infrastructure of any kind. A second file, `index-2.html`, was empty, as was a stray `analysis` file.

There is no existing PV+ code to preserve or build on top of. Per the user's direction, the legacy dashboard has been **moved to `/legacy/`** (not deleted) rather than discarded, and this repository is now being repurposed as the PV+ codebase from a clean foundation.

## B. Recommended Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | SSR for auth-gated regulated screens, file-based routing matches the 44-screen map, strong ecosystem, deployable to Vercel or any Node host |
| Backend/API | Next.js Route Handlers (API-first, versioned under `/api/v1`) | Co-located with frontend for Phase 0; can be split into standalone services later without changing the DB layer |
| Database | PostgreSQL via Supabase | Relational integrity for regulated data, native **Row-Level Security** for tenant isolation enforced at the DB layer (not just app layer), built-in Auth/MFA, storage for documents, migration tooling |
| Auth | Supabase Auth (email/password + TOTP MFA), extensible to SSO/OIDC per tenant | Meets §31/§5 MFA requirement out of the box; SAML/OIDC can be added per-tenant later for enterprise customers |
| Background jobs | Supabase Edge Functions / a queue (e.g. pgmq or a hosted queue) for E2B generation, AI processing, notifications | Async processing per §37, keeps request/response paths fast |
| File storage | Supabase Storage (or S3-compatible) with virus scanning hook | §30 document management, §31 security |
| AI layer | Provider-agnostic service module behind `lib/ai/`, calling Claude via the Anthropic API | Keeps AI Copilot outputs versioned, evidenced, and swappable; never writes directly to regulated tables — always produces a reviewable suggestion record |
| Hosting | Vercel (app) + Supabase Cloud (DB/Auth/Storage), or self-hosted equivalents | Not yet provisioned in this session — no cloud credentials are connected. Provisioning is a **separate, explicit step** requiring the user's cloud accounts |
| CI | GitHub Actions | Lint, typecheck, build, (test) on every push; replaces the old static-Pages-only workflow |

This is a recommendation, not a irreversible lock-in: the schema is plain PostgreSQL SQL and the app is standard Next.js, so migrating hosting providers later is low-risk.

## C. System Architecture

```
Browser (Next.js SSR/CSR)
   │
   ▼
Next.js App (Vercel/Node)
   ├── Route Handlers  /api/v1/*         (API-first, versioned)
   ├── Server Components                 (tenant-aware data fetching)
   ├── Middleware                        (session check, tenant resolution)
   └── lib/
        ├── supabase/  (server + browser clients)
        ├── auth/      (RBAC permission checks)
        ├── audit/     (audit_events writer)
        ├── ai/        (Case Copilot — provider-agnostic wrapper)
        └── regulatory/ (rules engine, E2B mapper — Phase 2)
   │
   ▼
Supabase (Postgres + Auth + Storage + Edge Functions)
   ├── RLS-enforced tenant isolation on every table
   ├── audit_events (append-only, no UPDATE/DELETE grants to app role)
   └── Storage buckets (per-tenant prefixes, scanned on upload)
```

Everything the browser does for regulated data goes through the Next.js server (Server Components / Route Handlers) using the **server-side** Supabase client with the user's session — the browser never talks to Postgres directly with elevated privilege, and RLS is the last line of defense even if application logic has a bug.

## D. Database Architecture

Implemented in Phase 0 (`supabase/migrations/`):

- `organizations` — tenants (includes CRO parent/child support via `parent_organization_id` for §45's hierarchical CRO model)
- `sites` — locations/workspaces within a tenant
- `users` — profile row linked 1:1 to `auth.users`, scoped to one `organization_id`
- `roles`, `permissions`, `role_permissions`, `user_roles` — RBAC (§5/§6 roles seeded as data, not hard-coded enums, so new roles can be added without a deploy)
- `audit_events` — append-only WHO/WHEN/WHAT/BEFORE/AFTER/ACTION log (§29), insert-only grants

Every tenant-scoped table carries `organization_id NOT NULL REFERENCES organizations(id)`, indexed, with an RLS policy restricting rows to the caller's organization (resolved server-side from the authenticated session — **never** trusted from client input, per §4). This is the foundation the full domain model (cases, patients, products, events, submissions, signals, etc. — §28) will be built on in Phase 1+, following the same pattern.

## E. Tenant Architecture

- Single Postgres instance, **shared-schema, RLS-isolated** multi-tenancy (not separate DBs per tenant) — standard for this scale, auditable, and avoids N-database migration overhead. Can be revisited for very large/regulated-isolation-sensitive customers later (schema-per-tenant is a documented escape hatch, not built now).
- CRO mode (§45): `organizations.parent_organization_id` lets a CRO organization have child client organizations. A CRO user's access to a client tenant is granted explicitly via `user_roles` scoped to that child `organization_id` — never implicit through the parent.
- Tenant context is resolved server-side per request from the authenticated session (which organization the user belongs to / has been granted access to), then passed to Postgres, which enforces it again via RLS. Two independent enforcement layers, matching §4's "never trust a frontend tenant identifier."

## F. Authentication / RBAC Architecture

- Supabase Auth handles credentials + session tokens; TOTP MFA enrollment is a Phase 0 screen stub (`/mfa`) wired to Supabase's MFA API, functionally completed once a Supabase project exists.
- `lib/auth/rbac.ts` exposes `can(user, permission, resource)` — permissions are `resource:action` strings (e.g. `case:approve`, `submission:submit`) stored in the `permissions` table and granted to roles via `role_permissions`, matching §5's granular verb list (view/create/edit/delete/approve/reject/submit/export/configure/review/close/reopen/administer).
- Route Handlers and Server Components call `can()` before any read/write; denial is itself an audit event.
- Segregation of duties (e.g. the person who codes a case shouldn't QC their own coding) is modeled as a data-level check (`assigned_user_id != reviewer_id`) layered on top of RBAC, to be implemented per-workflow in Phase 1.

## G. Regulatory Architecture

Not built in Phase 0 (correctly deferred — see Risks). The intended shape, per §14–16:

- A standalone `regulatory` schema/module: `authorities`, `jurisdictions`, `rule_sets`, `rule_versions` with a Draft → Review → Approved → Effective → Superseded lifecycle, independent of business logic elsewhere.
- E2B(R3) mapping/validation/submission as its own service layer reading from the case data model but never embedding jurisdiction rules inside case-processing UI code.
- No regulatory rule ships to production without an `approved` `rule_versions` row — enforced at the data layer, not just by convention.

This module requires real regulatory subject-matter input (which authorities, which rule versions) before implementation — flagged in Risks below.

## H. AI Architecture

- `lib/ai/` wraps model calls behind a single interface; every call and its output is persisted (`ai_requests`/`ai_outputs`/`provenance` tables, per §28's AI domain) with model version, timestamp, confidence, and source evidence — before it can be shown as a "suggestion."
- AI never writes to regulated tables directly. Every AI output is a proposal a permissioned human reviews and either accepts (which then performs the actual write, itself audited) or rejects.
- UX copy follows §39 literally: "AI Suggested," "Potential Duplicate," "Potential Safety Pattern," "Recommended Review" — never "Decided," "Confirmed," or "Required" unless a deterministic rule (not AI) makes it required.
- Not yet wired to a live model in Phase 0; the interface and provenance schema are the Phase 0 deliverable, real Case Copilot behavior is Phase 3.

## I. Security Architecture

Implemented or scaffolded in Phase 0:
- MFA-capable auth (Supabase), RBAC, tenant isolation via RLS, TLS (platform-provided by Vercel/Supabase), secure cookies (`httpOnly`, `secure`, `sameSite`) via Supabase SSR helpers, CSRF protection (Next.js Route Handler same-origin checks + Supabase's own), security headers (`next.config.mjs`), secrets via environment variables only (`.env.example` documents required vars, nothing committed), audit logging.

Deferred to explicit later work (not skipped, just not yet actionable without infra decisions): rate limiting (needs an edge/WAF layer choice), dependency scanning (needs Dependabot/Snyk enabled on the GitHub repo), malware scanning on uploads (needs a scanning provider), backup/DR runbook (needs the production Supabase project to exist first).

## J. Development Phases

Following §46 exactly:

- **Phase 0 — Foundation (this delivery):** repo restructure, Next.js scaffold, Postgres schema for tenant/RBAC/audit, auth screens, RBAC middleware, CI, docs.
- **Phase 1 — PV Core:** case intake → case management → patient/reporter/product/event/coding/workflow/medical review/QC/follow-up domain model and screens.
- **Phase 2 — Regulatory:** E2B(R3), rules engine, submission manager, ack/reconciliation.
- **Phase 3 — Intelligence:** AI Case Copilot, Safety Graph, Signal Radar, Safety Pulse, PV Health Score, Evidence Vault.
- **Phase 4 — Governance:** literature, signal management, aggregate reports, risk management, PSMF, quality/CAPA/audits/agreements.
- **Phase 5 — Scale:** regional expansion, integrations, mobile, advanced analytics.

Each phase should land as reviewable increments, not one giant change — matching §49's acceptance criteria (UI+API+DB+validation+permissions+audit+tests+docs per feature).

## K. Risks and Assumptions

- **No cloud infrastructure is connected yet.** This session has no live Supabase project or Vercel deployment target. Phase 0 code is complete and correct but **not yet deployed or runtime-tested against a real database.** Provisioning real infra is the next concrete step and needs the user's cloud accounts/credentials.
- **Regulatory content is out of scope for AI authorship.** E2B(R3) field mappings, jurisdiction-specific business rules, and MedDRA/dictionary licensing are specialist regulatory/medical inputs. This build provides the *architecture* to hold that content under version control and approval workflow — it does not invent regulatory rules. Per §51, this software supports PV operations; it does not itself grant regulatory compliance.
- **Controlled dictionaries (MedDRA, WHO-DD, etc.) are licensed content** — the platform will integrate with them structurally (versioned `terminology` tables) but cannot ship their proprietary content.
- **Scope is intentionally staged.** The master prompt describes a multi-year enterprise product (44 screens, dozens of regulated modules). Building all of it unreviewed in one pass would be both technically reckless (no validation checkpoints) and contrary to §50's explicit instruction to assess first. Each subsequent phase should be scoped and confirmed before large irreversible schema/UX decisions are made.
- **Demo data:** none has been created yet; when it is, it will be clearly synthetic (`PV+ Demo Pharma`, `PX-00x` products, `PV-2026-xxxxxx` case IDs) per §48, kept separate from any production seed path.

## L. Proposed Folder / Project Structure

```
/
├── ARCHITECTURE.md
├── README.md
├── .env.example
├── package.json / tsconfig.json / next.config.mjs / tailwind.config.ts
├── app/
│   ├── layout.tsx, globals.css
│   ├── login/page.tsx
│   ├── mfa/page.tsx
│   ├── select-organization/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx        # Safety Command Center
│   └── api/v1/...                    # Route Handlers (versioned)
├── lib/
│   ├── supabase/ (client.ts, server.ts)
│   ├── auth/ (rbac.ts)
│   ├── audit/ (audit.ts)
│   └── ai/ (index.ts — provider-agnostic interface)
├── supabase/
│   └── migrations/
│       ├── 0001_core_schema.sql
│       ├── 0002_audit.sql
│       └── 0003_rls_policies.sql
├── legacy/
│   └── sn-scort-90-day-execution-board.html   # preserved, not deleted
└── .github/workflows/ci.yml
```

Later phases add `app/(dashboard)/cases/...`, `app/(dashboard)/signals/...`, etc. following the §27 screen map, and corresponding `supabase/migrations/00xx_*.sql` per §28 domain.

## M. Initial Database Entity Relationship Design (Phase 0 scope)

```
organizations (tenant) ─┬─< sites
                         ├─< users ─< user_roles >─ roles ─< role_permissions >─ permissions
                         └─< audit_events

organizations.parent_organization_id → organizations.id   (CRO → client hierarchy, §45)
users.auth_user_id → auth.users.id                          (Supabase Auth link)
audit_events.organization_id, actor_user_id, entity_type, entity_id, action, before, after, occurred_at
```

Phase 1 extends this with the full ICSR domain (`patients`, `reporters`, `products`, `events`, `cases`, `case_versions`, ...) from §28, all carrying `organization_id` and following the same RLS pattern established here.

## N. First Milestone

**Milestone: Phase 0 Foundation, deployable.**

Definition of done:
1. Next.js app builds and runs locally against a Supabase project (once provisioned).
2. A user can sign up, verify, log in, enroll MFA, select their organization, and land on a Safety Command Center shell.
3. RBAC blocks a permission-less action end-to-end (UI hides it, API rejects it, attempt is audited).
4. `audit_events` records login, and any admin action, immutably.
5. CI runs lint/typecheck/build on every push to the branch.
6. Legacy dashboard is preserved and reachable at `/legacy`.

**Immediate next step requiring the user:** provision (or point to) a real Supabase project and hosting target so Phase 0 can be deployed and verified live, then confirm Phase 1 scope (which PV Core screens/entities to build first) before that work starts.

---

*Disclaimer (§51): PV+ is software supporting pharmacovigilance operations. It does not itself constitute or guarantee regulatory compliance — that depends on customer procedures, configuration, validation, qualified personnel, jurisdiction, data quality, and ongoing operational controls.*
