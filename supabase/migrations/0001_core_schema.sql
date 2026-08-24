-- PV+ Phase 0: Tenant, User, and RBAC core schema.
-- Every tenant-scoped table carries organization_id and is protected by RLS
-- (see 0003_rls_policies.sql). Roles/permissions are data, not enums, so new
-- roles can be introduced without a deploy.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  org_type text not null default 'sponsor'
    check (org_type in ('sponsor', 'mah', 'biotech', 'cro', 'pv_service_provider')),
  -- CRO hierarchical multi-client mode (see ARCHITECTURE.md section E/§45):
  -- a CRO organization may have client organizations beneath it. Access to a
  -- child is granted explicitly per-user via user_roles, never implied by
  -- the parent relationship.
  parent_organization_id uuid references organizations(id),
  subscription_tier text not null default 'lite'
    check (subscription_tier in ('lite', 'professional', 'enterprise', 'cro', 'intelligence')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_parent on organizations(parent_organization_id);

create table sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  country text,
  created_at timestamptz not null default now()
);

create index idx_sites_org on sites(organization_id);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  email text not null,
  full_name text,
  is_active boolean not null default true,
  mfa_enrolled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_org on users(organization_id);
create index idx_users_auth_user on users(auth_user_id);

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------

create table roles (
  id uuid primary key default gen_random_uuid(),
  -- Global (system-defined) roles have organization_id null; a tenant may
  -- also define custom roles scoped to itself.
  organization_id uuid references organizations(id),
  name text not null,
  description text,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  -- "resource:action", e.g. "case:approve", "submission:submit"
  key text not null unique,
  resource text not null,
  action text not null,
  description text
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  -- Scopes this role grant to a specific organization — required for the
  -- CRO case where a user's home org differs from a client org they've
  -- been granted access to.
  organization_id uuid not null references organizations(id),
  granted_by uuid references users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id, organization_id)
);

create index idx_user_roles_org on user_roles(organization_id);

-- ---------------------------------------------------------------------------
-- Seed: system roles (§5) and an initial permission set.
-- Additional permissions are added per-module as each domain is built.
-- ---------------------------------------------------------------------------

insert into roles (name, description, is_system_role) values
  ('System Administrator', 'Full platform administration', true),
  ('Organisation Administrator', 'Administers a single tenant', true),
  ('PV Administrator', 'Administers PV configuration for a tenant', true),
  ('Case Processor', 'Processes ICSR cases', true),
  ('Medical Reviewer', 'Performs medical review of cases', true),
  ('QC Reviewer', 'Performs quality control review', true),
  ('Signal Manager', 'Manages signal detection and evaluation', true),
  ('Regulatory User', 'Manages regulatory submissions', true),
  ('QA User', 'Manages quality processes, CAPA, audits', true),
  ('PSMF Manager', 'Manages the Pharmacovigilance System Master File', true),
  ('Auditor', 'Read-only audit access', true),
  ('Executive Read-Only', 'Read-only executive dashboards', true);

insert into permissions (key, resource, action, description) values
  ('organization:administer', 'organization', 'administer', 'Administer tenant settings'),
  ('user:administer', 'user', 'administer', 'Manage users and role assignments'),
  ('case:view', 'case', 'view', 'View ICSR cases'),
  ('case:create', 'case', 'create', 'Create ICSR cases'),
  ('case:edit', 'case', 'edit', 'Edit ICSR cases'),
  ('case:approve', 'case', 'approve', 'Approve case review stages'),
  ('case:close', 'case', 'close', 'Close a case'),
  ('case:reopen', 'case', 'reopen', 'Reopen a closed case'),
  ('submission:submit', 'submission', 'submit', 'Submit a regulatory report'),
  ('regulatory_rules:configure', 'regulatory_rules', 'configure', 'Configure regulatory rule sets'),
  ('audit_trail:view', 'audit_trail', 'view', 'View the audit trail');

-- System Administrator gets everything by default.
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'System Administrator';
