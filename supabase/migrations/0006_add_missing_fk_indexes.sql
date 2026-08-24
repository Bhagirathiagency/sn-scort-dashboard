-- Covering indexes for foreign keys flagged by the Supabase performance
-- advisor (unindexed_foreign_keys).

create index idx_audit_events_actor_user on audit_events(actor_user_id);
create index idx_role_permissions_permission on role_permissions(permission_id);
create index idx_user_roles_granted_by on user_roles(granted_by);
create index idx_user_roles_role on user_roles(role_id);
