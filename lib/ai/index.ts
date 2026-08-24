/**
 * Provider-agnostic AI Case Copilot interface. AI never writes directly to
 * regulated tables — every call is persisted as a reviewable suggestion
 * (ai_requests/ai_outputs, Phase 3) that a permissioned human accepts or
 * rejects. This module intentionally has no live model wiring yet; Phase 3
 * implements callers plus the provenance schema described in
 * ARCHITECTURE.md section H.
 */

export type AiSuggestion<T> = {
  modelVersion: string;
  createdAt: string;
  confidence: number | null;
  evidence: string[];
  output: T;
};

export interface AiCaseCopilot {
  suggestCoding(verbatimTerm: string): Promise<AiSuggestion<{ term: string; dictionary: string }[]>>;
  suggestDuplicates(caseId: string): Promise<AiSuggestion<{ caseId: string; similarity: number }[]>>;
  draftNarrative(caseId: string): Promise<AiSuggestion<string>>;
}
