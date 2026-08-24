-- PV+ Phase 0: Row-Level Security — the enforcement-of-last-resort for
-- tenant isolation (§4). Tenant context is never trusted from client input;
-- these policies resolve it from the authenticated session via the
-- current_organization_ids() helper below, which walks auth.uid() ->
-- users.organization_id and any additional grants in user_roles
-- (covering the CRO multi-client case, §45).

create or replace function current_organization_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select u.organization_id
  from users u
  where u.auth_user_id = auth.uid()
  union
  select ur.organization_id
  from user_roles ur
  join users u on u.id = ur.user_id
  where u.auth_user_id = auth.uid();
$$;

create or replace function user_has_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_permission text
) returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    join users u on u.id = ur.user_id
    where u.id = p_user_id
      and ur.organization_id = p_organization_id
      and p.key = p_permission
  );
$$;

alter table organizations enable row level security;
alter table sites enable row level security;
alter table users enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;
alter table audit_events enable row level security;

-- organizations: a user may see their own organization(s) only.
create policy org_isolation_select on organizations
  for select using (id in (select current_organization_ids()));

-- sites / users / user_roles / audit_events: standard tenant-scoped policy.
create policy sites_tenant_isolation on sites
  for all using (organization_id in (select current_organization_ids()));

create policy users_tenant_isolation on users
  for select using (organization_id in (select current_organization_ids()));

create policy user_roles_tenant_isolation on user_roles
  for select using (organization_id in (select current_organization_ids()));

create policy audit_events_tenant_isolation on audit_events
  for select using (organization_id in (select current_organization_ids()));

create policy audit_events_insert on audit_events
  for insert with check (organization_id in (select current_organization_ids()));

-- roles/permissions/role_permissions: readable by any authenticated user
-- (needed to render permission-aware UI); writes are restricted to system
-- administration flows layered on top via application-level checks, and to
-- rows scoped to the caller's own organization for custom roles.
create policy roles_readable on roles for select using (
  is_system_role = true or organization_id in (select current_organization_ids())
);
create policy permissions_readable on permissions for select using (true);
create policy role_permissions_readable on role_permissions for select using (true);
