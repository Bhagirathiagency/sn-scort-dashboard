-- Covering indexes for foreign keys flagged by the performance advisor
-- after 0007_case_domain.sql.

create index idx_case_versions_changed_by on case_versions(changed_by);
create index idx_cases_created_by on cases(created_by);
create index idx_cases_updated_by on cases(updated_by);
