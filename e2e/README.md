# E2E smoke tests

Not run in CI yet — there is no CI-scoped Supabase project (only Development exists), and these tests write real rows. Run locally against the `pv-plus-dev` project:

```bash
cp .env.example .env.local   # Supabase URL/anon key, plus E2E_DEMO_EMAIL/E2E_DEMO_PASSWORD
npm run dev &
E2E_DEMO_EMAIL=... E2E_DEMO_PASSWORD=... npx playwright test
```

The demo account is created directly in Postgres (`auth.users`/`auth.identities`/`public.users`/`public.user_roles`), not through the Auth API — see README.md "Development environment" for why there is no self-service sign-up to use instead. Ask for the current demo credentials rather than committing them anywhere.

**Known limitation:** this suite could not be executed inside the Claude Code session that authored it — that sandbox's network policy blocks direct browser/HTTP egress to the Supabase project host (confirmed via the environment's proxy status: a `connect_rejected`/403 policy denial), so `fetch()` calls from a real browser never reach Supabase there. Only server-side MCP tool calls (`execute_sql`, `apply_migration`, etc.) could reach the project from that session. The underlying flows (case creation, versioning, duplicate scoring) were instead verified directly via SQL against the live project — see the commit that introduced duplicate detection. Run this suite for real from an environment with normal network access.
