import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { listCases } from "@/lib/cases/service";
import { STATUS_LABEL } from "@/lib/cases/labels";
import type { CasePriority } from "@/lib/cases/types";

const priorityClass: Record<CasePriority, string> = {
  urgent: "bg-safe-red/10 text-safe-red",
  routine: "bg-navy-50 text-navy-600",
};

export default async function CaseWorklistPage() {
  const user = await getSessionUser();
  if (!user || !user.organizationId) redirect("/login");

  const cases = await listCases(user.organizationId);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Case Worklist</h1>
          <p className="text-sm text-navy-600">{cases.length} case(s) in this organisation.</p>
        </div>
        <Link href="/dashboard/cases/new" className="pv-btn-primary">
          New Case
        </Link>
      </header>

      <div className="pv-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-600">
            <tr>
              <th className="px-4 py-3">Case #</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Receipt Date</th>
              <th className="px-4 py-3">Serious</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-t border-navy-100 hover:bg-navy-50">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/cases/${c.id}`} className="font-mono text-teal-600 hover:underline">
                    {c.case_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="pv-badge bg-teal-50 text-teal-600">{STATUS_LABEL[c.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`pv-badge ${priorityClass[c.priority]}`}>{c.priority}</span>
                </td>
                <td className="px-4 py-3 text-navy-600">{c.source.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-navy-600">{c.country ?? "—"}</td>
                <td className="px-4 py-3 text-navy-600">{c.receipt_date}</td>
                <td className="px-4 py-3">{c.is_serious ? "Yes" : "No"}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-navy-600">
                  No cases yet. Create the first one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
