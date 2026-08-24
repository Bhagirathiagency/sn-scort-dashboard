import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { getCaseDetail } from "@/lib/cases/service";
import { STATUS_LABEL } from "@/lib/cases/labels";
import { CaseStatusActions } from "./status-actions";

export default async function CaseOverviewPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !user.organizationId) redirect("/login");

  const caseDetail = await getCaseDetail(user.organizationId, params.id);
  if (!caseDetail) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-navy-900">{caseDetail.case_number}</h1>
          <span className="pv-badge bg-teal-50 text-teal-600">{STATUS_LABEL[caseDetail.status]}</span>
          {caseDetail.is_serious && <span className="pv-badge bg-safe-red/10 text-safe-red">Serious</span>}
          <span className="pv-badge bg-navy-50 text-navy-600">v{caseDetail.version}</span>
        </div>
        <p className="mt-1 text-sm text-navy-600">
          Source: {caseDetail.source.replace(/_/g, " ")} · Received {caseDetail.receipt_date} · Country:{" "}
          {caseDetail.country ?? "—"}
        </p>
      </header>

      <CaseStatusActions caseId={caseDetail.id} status={caseDetail.status} />

      <div className="grid grid-cols-2 gap-4">
        <section className="pv-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">Patient</h2>
          {caseDetail.patient ? (
            <dl className="space-y-1 text-sm">
              <Row label="Initials" value={caseDetail.patient.initials} />
              <Row label="Age" value={caseDetail.patient.age?.toString()} />
              <Row label="Age group" value={caseDetail.patient.age_group} />
              <Row label="Sex" value={caseDetail.patient.sex} />
            </dl>
          ) : (
            <p className="text-sm text-navy-600">No patient information recorded.</p>
          )}
        </section>

        <section className="pv-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">Reporter</h2>
          {caseDetail.reporter ? (
            <dl className="space-y-1 text-sm">
              <Row label="Type" value={caseDetail.reporter.reporter_type} />
              <Row
                label="Healthcare professional"
                value={caseDetail.reporter.is_healthcare_professional ? "Yes" : "No"}
              />
              <Row label="Country" value={caseDetail.reporter.country} />
            </dl>
          ) : (
            <p className="text-sm text-navy-600">No reporter information recorded.</p>
          )}
        </section>

        <section className="pv-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Suspect / Concomitant Products
          </h2>
          <ul className="space-y-3 text-sm">
            {caseDetail.case_products.map((cp, i) => (
              <li key={i} className="border-b border-navy-100 pb-2 last:border-0">
                <p className="font-medium">
                  {cp.product?.product_name ?? "Unknown product"}{" "}
                  <span className="pv-badge bg-navy-50 text-navy-600">{cp.role}</span>
                </p>
                <p className="text-navy-600">
                  {[cp.dose, cp.route, cp.indication].filter(Boolean).join(" · ") || "No further detail"}
                </p>
              </li>
            ))}
            {caseDetail.case_products.length === 0 && <p className="text-navy-600">None recorded.</p>}
          </ul>
        </section>

        <section className="pv-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
            Adverse Events
          </h2>
          <ul className="space-y-3 text-sm">
            {caseDetail.case_events.map((ev, i) => (
              <li key={i} className="border-b border-navy-100 pb-2 last:border-0">
                <p className="font-medium">{ev.verbatim_term}</p>
                <p className="text-navy-600">
                  {[ev.onset_date, ev.outcome, ev.severity].filter(Boolean).join(" · ") || "No further detail"}
                </p>
                <p className="text-xs text-navy-600">
                  MedDRA: {ev.meddra_term ?? "Not yet coded"}
                </p>
              </li>
            ))}
            {caseDetail.case_events.length === 0 && <p className="text-navy-600">None recorded.</p>}
          </ul>
        </section>
      </div>

      <section className="pv-card mt-4 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy-600">Narrative</h2>
        <p className="whitespace-pre-wrap text-sm text-navy-900">
          {caseDetail.narrative || "No narrative recorded yet."}
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <dt className="text-navy-600">{label}</dt>
      <dd className="font-medium text-navy-900">{value || "—"}</dd>
    </div>
  );
}
