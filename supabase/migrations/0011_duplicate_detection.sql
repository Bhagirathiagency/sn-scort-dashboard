-- PV+ Phase 1: Duplicate Detection (§9, §27 "Duplicate Review").
--
-- This is deliberately a deterministic, explainable rule-based scorer —
-- not an ML/AI system — comparing configurable attributes (country,
-- patient sex/age, suspect product, event verbatim term) across cases in
-- the same tenant. It NEVER merges cases: it only writes a scored
-- candidate row that a qualified user must explicitly confirm or reject.
-- Re-running detection upserts the score/evidence but never overwrites an
-- existing human decision.

create table case_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  case_id uuid not null references cases(id) on delete cascade,
  candidate_case_id uuid not null references cases(id) on delete cascade,
  similarity_score integer not null check (similarity_score between 0 and 100),
  matching_fields jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed_duplicate', 'not_duplicate')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (case_id <> candidate_case_id),
  unique (case_id, candidate_case_id)
);

create index idx_dup_candidates_org on case_duplicate_candidates(organization_id);
create index idx_dup_candidates_case on case_duplicate_candidates(case_id);
create index idx_dup_candidates_candidate on case_duplicate_candidates(candidate_case_id);
create index idx_dup_candidates_reviewed_by on case_duplicate_candidates(reviewed_by);

alter table case_duplicate_candidates enable row level security;

create policy dup_candidates_tenant_isolation on case_duplicate_candidates
  for all using (organization_id in (select current_organization_ids()));

-- Scans other (non-closed) cases in the same tenant and upserts a scored
-- candidate row for every pair scoring at or above the threshold.
-- SECURITY INVOKER: runs as the calling user, subject to RLS on every
-- table it touches, same as create_case().
create or replace function compute_duplicate_candidates(p_case_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_org uuid;
  v_country text;
  v_sex text;
  v_age integer;
  r record;
  v_score integer;
  v_fields jsonb;
begin
  select c.organization_id, c.country, p.sex, p.age
  into v_org, v_country, v_sex, v_age
  from cases c
  left join patients p on p.id = c.patient_id
  where c.id = p_case_id;

  if v_org is null then
    raise exception 'Case % not found', p_case_id;
  end if;

  for r in
    select
      other.id as other_case_id,
      (v_country is not null and other.country = v_country) as country_match,
      (v_sex is not null and op.sex is not null and op.sex = v_sex) as sex_match,
      (v_age is not null and op.age is not null and abs(op.age - v_age) <= 5) as age_match,
      exists (
        select 1 from case_products cp1
        join case_products cp2 on cp2.case_id = other.id
        join products pr1 on pr1.id = cp1.product_id
        join products pr2 on pr2.id = cp2.product_id
        where cp1.case_id = p_case_id
          and (pr1.product_name ilike pr2.product_name
               or (pr1.active_substance is not null and pr1.active_substance ilike pr2.active_substance))
      ) as product_match,
      exists (
        select 1 from case_events ce1
        join case_events ce2 on ce2.case_id = other.id
        where ce1.case_id = p_case_id
          and (ce1.verbatim_term ilike '%' || ce2.verbatim_term || '%'
               or ce2.verbatim_term ilike '%' || ce1.verbatim_term || '%')
      ) as event_match
    from cases other
    left join patients op on op.id = other.patient_id
    where other.organization_id = v_org
      and other.id <> p_case_id
      and other.status <> 'closed'
  loop
    v_score := 0;
    v_fields := '[]'::jsonb;

    if r.country_match then
      v_score := v_score + 20; v_fields := v_fields || '["country"]'::jsonb;
    end if;
    if r.sex_match then
      v_score := v_score + 15; v_fields := v_fields || '["patient_sex"]'::jsonb;
    end if;
    if r.age_match then
      v_score := v_score + 15; v_fields := v_fields || '["patient_age"]'::jsonb;
    end if;
    if r.product_match then
      v_score := v_score + 25; v_fields := v_fields || '["suspect_product"]'::jsonb;
    end if;
    if r.event_match then
      v_score := v_score + 25; v_fields := v_fields || '["adverse_event"]'::jsonb;
    end if;

    if v_score >= 40 then
      insert into case_duplicate_candidates (
        organization_id, case_id, candidate_case_id, similarity_score, matching_fields
      ) values (
        v_org, p_case_id, r.other_case_id, v_score, v_fields
      )
      on conflict (case_id, candidate_case_id)
      do update set
        similarity_score = excluded.similarity_score,
        matching_fields = excluded.matching_fields,
        updated_at = now()
      where case_duplicate_candidates.status = 'pending';
    end if;
  end loop;
end;
$$;

revoke execute on function compute_duplicate_candidates(uuid) from public;
grant execute on function compute_duplicate_candidates(uuid) to authenticated;

-- New permission for the human decision step (§5 "Review" verb).
insert into permissions (key, resource, action, description) values
  ('case_duplicate:review', 'case_duplicate', 'review', 'Confirm or reject a potential duplicate case')
on conflict (key) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'System Administrator' and p.key = 'case_duplicate:review'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.name = 'Case Processor' and p.key = 'case_duplicate:review'
on conflict do nothing;
