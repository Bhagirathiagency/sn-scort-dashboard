-- PV+ Phase 0: Append-only audit trail (§29).
-- No UPDATE or DELETE grant is given to the application role — see the
-- REVOKE statements below and the RLS policies in 0003_rls_policies.sql.
-- Normal users, including admins, cannot alter or remove audit records.

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_user_id uuid references users(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  occurred_at timestamptz not null default now()
);

create index idx_audit_events_org on audit_events(organization_id);
create index idx_audit_events_entity on audit_events(entity_type, entity_id);
create index idx_audit_events_occurred_at on audit_events(occurred_at desc);

-- Application connects as the 'authenticated' role (Supabase default);
-- explicitly deny UPDATE/DELETE so the audit trail is insert-and-select only.
revoke update, delete on audit_events from authenticated;
grant select, insert on audit_events to authenticated;
