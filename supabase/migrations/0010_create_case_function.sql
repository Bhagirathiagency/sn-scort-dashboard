-- Atomic case creation. SECURITY INVOKER (the default — not DEFINER): this
-- runs as the calling authenticated user, so every insert it performs is
-- still checked against each table's RLS policy exactly as if the caller
-- had run the statements directly. A single function call is one implicit
-- transaction, so a failure partway through (e.g. a bad org id) rolls back
-- the whole case rather than leaving an orphaned patient/reporter/product
-- row behind.

create or replace function create_case(
  p_organization_id uuid,
  p_created_by uuid,
  p_source text,
  p_country text,
  p_receipt_date date,
  p_priority text,
  p_is_serious boolean,
  p_narrative text,
  p_patient jsonb,
  p_reporter jsonb,
  p_product jsonb,
  p_event jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_reporter_id uuid;
  v_product_id uuid;
  v_case_id uuid;
  v_case_number text;
begin
  insert into patients (organization_id, initials, age, age_group, sex)
  values (
    p_organization_id,
    nullif(p_patient->>'initials', ''),
    nullif(p_patient->>'age', '')::int,
    nullif(p_patient->>'age_group', ''),
    nullif(p_patient->>'sex', '')
  )
  returning id into v_patient_id;

  insert into reporters (organization_id, reporter_type, is_healthcare_professional, country)
  values (
    p_organization_id,
    p_reporter->>'reporter_type',
    coalesce((p_reporter->>'is_healthcare_professional')::boolean, false),
    nullif(p_reporter->>'country', '')
  )
  returning id into v_reporter_id;

  insert into products (organization_id, product_name, active_substance)
  values (
    p_organization_id,
    p_product->>'product_name',
    nullif(p_product->>'active_substance', '')
  )
  returning id into v_product_id;

  v_case_number := generate_case_number(p_organization_id);

  insert into cases (
    organization_id, case_number, source, country, receipt_date,
    priority, is_serious, narrative, patient_id, reporter_id, created_by
  ) values (
    p_organization_id, v_case_number, p_source, nullif(p_country, ''), p_receipt_date,
    p_priority, p_is_serious, nullif(p_narrative, ''), v_patient_id, v_reporter_id, p_created_by
  )
  returning id into v_case_id;

  insert into case_products (case_id, product_id, role, dose, route, indication)
  values (
    v_case_id, v_product_id, 'suspect',
    nullif(p_product->>'dose', ''), nullif(p_product->>'route', ''), nullif(p_product->>'indication', '')
  );

  insert into case_events (case_id, verbatim_term, onset_date, outcome, severity)
  values (
    v_case_id,
    p_event->>'verbatim_term',
    nullif(p_event->>'onset_date', '')::date,
    nullif(p_event->>'outcome', ''),
    nullif(p_event->>'severity', '')
  );

  return v_case_id;
end;
$$;

revoke execute on function create_case(
  uuid, uuid, text, text, date, text, boolean, text, jsonb, jsonb, jsonb, jsonb
) from public;

grant execute on function create_case(
  uuid, uuid, text, text, date, text, boolean, text, jsonb, jsonb, jsonb, jsonb
) to authenticated;
