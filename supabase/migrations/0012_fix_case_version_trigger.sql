-- Fixes a real bug in 0007_case_domain.sql: snapshot_case_version() ran
-- BEFORE INSERT and tried to insert into case_versions referencing
-- case_id = NEW.id — but the row does not exist in `cases` yet at that
-- point (a BEFORE trigger fires before the row is written), so every
-- case insert violated case_versions_case_id_fkey. Discovered by actually
-- exercising the schema with data rather than only tsc/lint/build.
--
-- Fix: split the one BEFORE trigger into two:
--   - bump_case_version(): BEFORE UPDATE only, mutates NEW.version/
--     NEW.updated_at (must run before the row is written to take effect)
--   - snapshot_case_version(): AFTER INSERT OR UPDATE, inserts the
--     snapshot once the row genuinely exists in `cases`

drop trigger if exists trg_snapshot_case_version on cases;
drop function if exists snapshot_case_version();

create or replace function bump_case_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_bump_case_version
  before update on cases
  for each row execute function bump_case_version();

create or replace function snapshot_case_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into case_versions (case_id, version_number, snapshot, changed_by)
  values (new.id, new.version, to_jsonb(new), coalesce(new.updated_by, new.created_by));

  return new;
end;
$$;

create trigger trg_snapshot_case_version
  after insert or update on cases
  for each row execute function snapshot_case_version();
