-- Matches a fix applied directly to the provisioned Dev project after the
-- security advisor flagged mutable search_path on the two new Phase 1a
-- functions (same class of finding as 0004_harden_rls_functions.sql).
-- 0007_case_domain.sql was also corrected in place before this migration
-- was written, so this is a redundant-but-idempotent CREATE OR REPLACE —
-- kept as its own file so the migration ledger matches exactly what was
-- applied to the remote project, rather than rewriting 0007's history.

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
