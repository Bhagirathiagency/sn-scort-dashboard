export type CaseStatus =
  | "new"
  | "validation"
  | "triage"
  | "processing"
  | "medical_review"
  | "qc"
  | "submission_ready"
  | "submitted"
  | "follow_up"
  | "closed"
  | "reopened";

export type CasePriority = "routine" | "urgent";

export type CaseSource =
  | "email"
  | "web_form"
  | "manual_entry"
  | "literature"
  | "clinical_source"
  | "partner"
  | "affiliate"
  | "regulatory_authority"
  | "api"
  | "uploaded_document";

export type CaseListItem = {
  id: string;
  case_number: string;
  status: CaseStatus;
  priority: CasePriority;
  source: CaseSource;
  country: string | null;
  receipt_date: string;
  is_serious: boolean;
  created_at: string;
};

export type CaseDetail = CaseListItem & {
  initial_awareness_date: string | null;
  reporting_category: string | null;
  narrative: string | null;
  version: number;
  patient: {
    initials: string | null;
    age: number | null;
    age_group: string | null;
    sex: string | null;
  } | null;
  reporter: {
    reporter_type: string;
    is_healthcare_professional: boolean;
    country: string | null;
  } | null;
  case_products: Array<{
    role: string;
    dose: string | null;
    route: string | null;
    indication: string | null;
    product: { product_name: string; active_substance: string | null } | null;
  }>;
  case_events: Array<{
    verbatim_term: string;
    meddra_term: string | null;
    onset_date: string | null;
    outcome: string | null;
    severity: string | null;
  }>;
};

export type DuplicateCandidateStatus = "pending" | "confirmed_duplicate" | "not_duplicate";

export type DuplicateCandidate = {
  id: string;
  similarity_score: number;
  matching_fields: string[];
  status: DuplicateCandidateStatus;
  reviewed_at: string | null;
  candidate_case: {
    id: string;
    case_number: string;
    status: CaseStatus;
  };
};

export type CreateCaseInput = {
  source: CaseSource;
  country: string;
  receiptDate: string;
  priority: CasePriority;
  isSerious: boolean;
  narrative: string;
  patient: {
    initials: string;
    age: string;
    ageGroup: string;
    sex: string;
  };
  reporter: {
    reporterType: string;
    isHealthcareProfessional: boolean;
    country: string;
  };
  product: {
    productName: string;
    activeSubstance: string;
    dose: string;
    route: string;
    indication: string;
  };
  event: {
    verbatimTerm: string;
    onsetDate: string;
    outcome: string;
    severity: string;
  };
};
