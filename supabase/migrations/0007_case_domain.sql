-- PV+ Phase 1a: minimal viable ICSR case domain (§7-§9, §28).
-- Scope is deliberately narrow — enough for Case Intake -> Worklist ->
-- Overview to run against real data. Coding (MedDRA), medical review,
-- QC, duplicate detection, and regulatory submission are later slices
-- that extend this schema rather than replace it.
--
-- Every table is tenant-scoped (organization_id) and RLS-protected, same
-- pattern as 0001-0003. Case data is versioned (§40: never overwrite a
-- regulated record) via a trigger that snapshots every insert/update into
-- case_versions rather than relying on callers to remember to do so.

-- ---------------------------------------------------------------------------
-- Patient / Reporter / Product (case-scoped entities)
-- ---------------------------------------------------------------------------

create table patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  -- Data minimisation (§8): initials only, never full identity, by design.
  initials text,
  age integer,
  age_group text check (age_group in ('neonate', 'infant', 'child', 'adolescent', 'adult', 'elderly', 'unknown')),
  sex text check (sex in ('male', 'female', 'unknown', 'not_reported')),
  weight_kg numeric(6,2),
  height_cm numeric(6,2),
  pregnancy_status text,
  relevant_medical_history text,
  relevant_lab_information text,
  created_at timestamptz not null default now()
);

create index idx_patients_org on patients(organization_id);

create table reporters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  reporter_type text not null check (reporter_type in
    ('physician', 'pharmacist', 'nurse', 'other_hcp', 'consumer', 'lawyer', 'other')),
  qualification text,
  is_healthcare_professional boolean not null default false,
  country text,
  contact_info jsonb,
  is_primary_source boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_reporters_org on reporters(organization_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  product_name text not null,
  active_substance text,
  manufacturer text,
  mah text,
  created_at timestamptz not null default now()
);

create index idx_products_org on products(organization_id);

-- ---------------------------------------------------------------------------
-- Case number generation: PV-YYYY-NNNNNN per tenant per year (§48 format).
-- ---------------------------------------------------------------------------

create table case_counters (
  organization_id uuid not null references organizations(id),
  year integer not null,
  next_number integer not null default 1,
  primary key (organization_id, year)
);

create or replace function generate_case_number(p_organization_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_year integer := extract(year from now());
  v_number integer;
begin
  insert into case_counters (organization_id, year, next_number)
  values (p_organization_id, v_year, 2)
  on conflict (organization_id, year)
    do update set next_number = case_counters.next_number + 1
  returning next_number - 1 into v_number;

  return 'PV-' || v_year || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------

create table cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  case_number text not null unique,
  status text not null default 'new' check (status in (
    'new', 'validation', 'triage', 'processing', 'medical_review',
    'qc', 'submission_ready', 'submitted', 'follow_up', 'closed', 'reopened'
  )),
  priority text not null default 'routine' check (priority in ('routine', 'urgent')),
  source text not null check (source in (
    'email', 'web_form', 'manual_entry', 'literature', 'clinical_source',
    'partner', 'affiliate', 'regulatory_authority', 'api', 'uploaded_document'
  )),
  country text,
  receipt_date date not null default current_date,
  initial_awareness_date date,
  is_serious boolean not null default false,
  reporting_category text,
  patient_id uuid references patients(id),
  reporter_id uuid references reporters(id),
  narrative text,
  version integer not null default 1,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cases_org on cases(organization_id);
create index idx_cases_status on cases(organization_id, status);
create index idx_cases_patient on cases(patient_id);
create index idx_cases_reporter on cases(reporter_id);

create table case_products (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  product_id uuid not null references products(id),
  role text not null default 'suspect' check (role in ('suspect', 'concomitant', 'interacting')),
  dose text,
  route text,
  frequency text,
  start_date date,
  stop_date date,
  indication text,
  batch_lot text,
  created_at timestamptz not null default now()
);

create index idx_case_products_case on case_products(case_id);
create index idx_case_products_product on case_products(product_id);

create table case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  verbatim_term text not null,
  meddra_term text,
  onset_date date,
  outcome text check (outcome in (
    'recovered', 'recovering', 'not_recovered', 'recovered_with_sequelae', 'fatal', 'unknown'
  )),
  seriousness_criteria text[],
  severity text check (severity in ('mild', 'moderate', 'severe')),
  created_at timestamptz not null default now()
);

create index idx_case_events_case on case_events(case_id);

-- ---------------------------------------------------------------------------
-- Case versioning (§40): every insert/update snapshots into case_versions.
-- Historical versions are never overwritten or deleted by the app role.
-- ---------------------------------------------------------------------------

create table case_versions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (case_id, version_number)
);

create index idx_case_versions_case on case_versions(case_id);

revoke update, delete on case_versions from authenticated;
grant select, insert on case_versions to authenticated;

create or replace function snapshot_case_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.version := old.version + 1;
    new.updated_at := now();
  end if;

  insert into case_versions (case_id, version_number, snapshot, changed_by)
  values (new.id, new.version, to_jsonb(new), coalesce(new.updated_by, new.created_by));

  return new;
end;
$$;

create trigger trg_snapshot_case_version
  before insert or update on cases
  for each row execute function snapshot_case_version();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table patients enable row level security;
alter table reporters enable row level security;
alter table products enable row level security;
alter table case_counters enable row level security;
alter table cases enable row level security;
alter table case_products enable row level security;
alter table case_events enable row level security;
alter table case_versions enable row level security;

create policy patients_tenant_isolation on patients
  for all using (organization_id in (select current_organization_ids()));

create policy reporters_tenant_isolation on reporters
  for all using (organization_id in (select current_organization_ids()));

create policy products_tenant_isolation on products
  for all using (organization_id in (select current_organization_ids()));

create policy case_counters_tenant_isolation on case_counters
  for all using (organization_id in (select current_organization_ids()));

create policy cases_tenant_isolation on cases
  for all using (organization_id in (select current_organization_ids()));

create policy case_products_tenant_isolation on case_products
  for all using (
    case_id in (select id from cases where organization_id in (select current_organization_ids()))
  );

create policy case_events_tenant_isolation on case_events
  for all using (
    case_id in (select id from cases where organization_id in (select current_organization_ids()))
  );

create policy case_versions_tenant_isolation on case_versions
  for select using (
    case_id in (select id from cases where organization_id in (select current_organization_ids()))
  );

create policy case_versions_insert on case_versions
  for insert with check (
    case_id in (select id from cases where organization_id in (select current_organization_ids()))
  );

-- ---------------------------------------------------------------------------
-- Case-domain permissions (extends the seed in 0001_core_schema.sql)
-- ---------------------------------------------------------------------------

insert into permissions (key, resource, action, description) values
  ('patient:view', 'patient', 'view', 'View patient information on a case'),
  ('patient:edit', 'patient', 'edit', 'Edit patient information on a case'),
  ('reporter:view', 'reporter', 'view', 'View reporter information on a case'),
  ('reporter:edit', 'reporter', 'edit', 'Edit reporter information on a case'),
  ('case_event:edit', 'case_event', 'edit', 'Edit adverse event details on a case'),
  ('case_product:edit', 'case_product', 'edit', 'Edit suspect/concomitant product details on a case')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'System Administrator'
  and p.key in (
    'patient:view', 'patient:edit', 'reporter:view', 'reporter:edit',
    'case_event:edit', 'case_product:edit'
  )
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'Case Processor'
  and p.key in (
    'case:view', 'case:create', 'case:edit',
    'patient:view', 'patient:edit', 'reporter:view', 'reporter:edit',
    'case_event:edit', 'case_product:edit'
  )
on conflict do nothing;
