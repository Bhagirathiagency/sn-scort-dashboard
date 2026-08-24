-- PV+ Phase 1b: Medical Review / QC review history (§11, §27 "Medical Review").
-- A review is a comment plus an optional decision (approve/return); a
-- decision that advances or returns the case still goes through the same
-- cases.status transition machinery (0007/0012's trigger, the transition
-- graph enforced in application code) rather than writing status here —
-- this table is purely the review record/audit trail, never the source
-- of truth for case status.

create table case_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  case_id uuid not null references cases(id) on delete cascade,
  stage text not null check (stage in ('medical_review', 'qc')),
  reviewer_id uuid not null references users(id),
  decision text not null default 'comment' check (decision in ('approved', 'returned', 'comment')),
  comment text,
  created_at timestamptz not null default now()
);

create index idx_case_reviews_org on case_reviews(organization_id);
create index idx_case_reviews_case on case_reviews(case_id);
create index idx_case_reviews_reviewer on case_reviews(reviewer_id);

alter table case_reviews enable row level security;

-- Insert-and-select only — a review record, once made, is not edited or
-- deleted (same append-only principle as audit_events/case_versions).
revoke update, delete on case_reviews from authenticated;
grant select, insert on case_reviews to authenticated;

create policy case_reviews_tenant_isolation on case_reviews
  for select using (organization_id in (select current_organization_ids()));

create policy case_reviews_insert on case_reviews
  for insert with check (organization_id in (select current_organization_ids()));
