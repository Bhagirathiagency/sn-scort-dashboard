"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewDecision, ReviewStage } from "@/lib/cases/types";

export function ReviewForm({ caseId, stage }: { caseId: string; stage: ReviewStage }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<ReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: ReviewDecision) {
    if (decision !== "comment" && !comment.trim() && decision === "returned") {
      setError("A reason is required when returning a case for rework.");
      return;
    }

    setPending(decision);
    setError(null);

    const res = await fetch(`/api/v1/cases/${caseId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, decision, comment }),
    });

    const body = await res.json();
    setPending(null);

    if (!res.ok) {
      setError(body.error ?? "Failed to submit review");
      return;
    }

    setComment("");
    router.refresh();
  }

  return (
    <div className="pv-card p-5">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">
        {stage === "medical_review" ? "Medical Review" : "QC Review"} — Actions
      </p>
      <textarea
        rows={3}
        className="pv-input mb-3"
        placeholder="Comment (required when returning for rework)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="mb-2 text-sm text-safe-red">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => submit("approved")}
          disabled={pending !== null}
          className="pv-btn-primary disabled:opacity-50"
        >
          {pending === "approved" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => submit("returned")}
          disabled={pending !== null}
          className="pv-badge bg-safe-amber/10 text-safe-amber disabled:opacity-50"
        >
          {pending === "returned" ? "Returning…" : "Return to Processing"}
        </button>
        <button
          onClick={() => submit("comment")}
          disabled={pending !== null}
          className="pv-badge bg-navy-50 text-navy-600 disabled:opacity-50"
        >
          {pending === "comment" ? "Adding…" : "Add Comment"}
        </button>
      </div>
    </div>
  );
}
