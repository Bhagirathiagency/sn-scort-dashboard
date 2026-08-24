"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_LABEL } from "@/lib/cases/labels";
import type { DuplicateCandidate } from "@/lib/cases/types";

const FIELD_LABEL: Record<string, string> = {
  country: "Country",
  patient_sex: "Patient sex",
  patient_age: "Patient age (±5y)",
  suspect_product: "Suspect product",
  adverse_event: "Adverse event",
};

export function DuplicatePanel({
  caseId,
  initialCandidates,
}: {
  caseId: string;
  initialCandidates: DuplicateCandidate[];
}) {
  const router = useRouter();
  const [candidates, setCandidates] = useState(initialCandidates);
  const [checking, setChecking] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setChecking(true);
    setError(null);

    const res = await fetch(`/api/v1/cases/${caseId}/duplicates`, { method: "POST" });
    const body = await res.json();
    setChecking(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to run duplicate detection");
      return;
    }
    setCandidates(body.data);
  }

  async function handleReview(candidateId: string, decision: "confirmed_duplicate" | "not_duplicate") {
    setReviewingId(candidateId);
    setError(null);

    const res = await fetch(`/api/v1/cases/duplicates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const body = await res.json();
    setReviewingId(null);

    if (!res.ok) {
      setError(body.error ?? "Failed to record decision");
      return;
    }

    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, status: decision } : c)));
    router.refresh();
  }

  return (
    <section className="pv-card mt-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-600">
          Potential Duplicates
        </h2>
        <button onClick={handleCheck} disabled={checking} className="pv-btn-primary disabled:opacity-50">
          {checking ? "Checking…" : "Check for duplicates"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-safe-red">{error}</p>}

      {candidates.length === 0 ? (
        <p className="text-sm text-navy-600">
          No potential duplicates found. This does not rule out a real duplicate — matching is based
          on country, patient, suspect product, and event term only.
        </p>
      ) : (
        <ul className="space-y-3">
          {candidates.map((c) => (
            <li key={c.id} className="border-b border-navy-100 pb-3 last:border-0">
              <div className="flex items-center justify-between">
                <Link
                  href={`/dashboard/cases/${c.candidate_case.id}`}
                  className="font-mono text-teal-600 hover:underline"
                >
                  {c.candidate_case.case_number}
                </Link>
                <span className="pv-badge bg-navy-50 text-navy-600">
                  {STATUS_LABEL[c.candidate_case.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-navy-900">
                {c.similarity_score}% similarity — {c.matching_fields.map((f) => FIELD_LABEL[f] ?? f).join(", ")}
              </p>

              {c.status === "pending" ? (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleReview(c.id, "confirmed_duplicate")}
                    disabled={reviewingId !== null}
                    className="pv-badge bg-safe-red/10 text-safe-red disabled:opacity-50"
                  >
                    Confirm duplicate
                  </button>
                  <button
                    onClick={() => handleReview(c.id, "not_duplicate")}
                    disabled={reviewingId !== null}
                    className="pv-badge bg-teal-50 text-teal-600 disabled:opacity-50"
                  >
                    Not a duplicate
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-xs text-navy-600">
                  Reviewed: {c.status === "confirmed_duplicate" ? "Confirmed duplicate" : "Not a duplicate"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
