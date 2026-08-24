-- Harden the RLS helper functions per Supabase security advisor: pin
-- search_path to prevent schema-injection on a SECURITY DEFINER function.

create or replace function current_organization_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
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
set search_path = public
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

revoke execute on function current_organization_ids() from anon;
revoke execute on function user_has_permission(uuid, uuid, text) from anon;
