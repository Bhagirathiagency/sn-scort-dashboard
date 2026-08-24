"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALLOWED_TRANSITIONS } from "@/lib/cases/workflow";
import { STATUS_LABEL } from "@/lib/cases/labels";
import type { CaseStatus } from "@/lib/cases/types";

/**
 * Renders the valid next transitions for the case's current status
 * (§7 lifecycle). The API route re-validates the transition and the
 * caller's permission server-side — this component only reflects what
 * to offer, it does not enforce anything on its own.
 */
export function CaseStatusActions({ caseId, status }: { caseId: string; status: CaseStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState<CaseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? [];

  async function handleTransition(toStatus: CaseStatus) {
    setPending(toStatus);
    setError(null);

    const res = await fetch(`/api/v1/cases/${caseId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    });

    const body = await res.json();
    setPending(null);

    if (!res.ok) {
      setError(body.error ?? "Failed to update case status");
      return;
    }

    router.refresh();
  }

  if (nextStatuses.length === 0) return null;

  return (
    <div className="pv-card mb-4 p-4">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">Actions</p>
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map((next) => (
          <button
            key={next}
            onClick={() => handleTransition(next)}
            disabled={pending !== null}
            className="pv-btn-primary disabled:opacity-50"
          >
            {pending === next ? "Updating…" : `Move to ${STATUS_LABEL[next]}`}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-safe-red">{error}</p>}
    </div>
  );
}
