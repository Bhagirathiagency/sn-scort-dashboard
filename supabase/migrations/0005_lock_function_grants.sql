-- The prior migration only removed the explicit grant to `anon`; Postgres
-- functions are EXECUTE-able by PUBLIC by default, which anon inherits.
-- Revoke from PUBLIC and grant only to `authenticated`, which is the only
-- role that ever needs to resolve tenant/permission context.

revoke execute on function current_organization_ids() from public;
revoke execute on function user_has_permission(uuid, uuid, text) from public;

grant execute on function current_organization_ids() to authenticated;
grant execute on function user_has_permission(uuid, uuid, text) to authenticated;
