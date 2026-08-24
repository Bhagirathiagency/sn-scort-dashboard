import { getSessionUser } from "@/lib/supabase/server";
import { listCases } from "@/lib/cases/service";

type PulseItem = {
  tone: "red" | "amber" | "info";
  label: string;
};

const toneClass: Record<PulseItem["tone"], string> = {
  red: "bg-safe-red/10 text-safe-red",
  amber: "bg-safe-amber/10 text-safe-amber",
  info: "bg-teal-50 text-teal-600",
};

export default async function SafetyCommandCenterPage() {
  const user = await getSessionUser();
  const cases = user?.organizationId ? await listCases(user.organizationId) : [];

  const urgentCount = cases.filter((c) => c.priority === "urgent" && c.status !== "closed").length;
  const pendingCount = cases.filter((c) => c.status !== "closed").length;
  const seriousCount = cases.filter((c) => c.is_serious).length;

  const pulse: PulseItem[] = [
    { tone: urgentCount > 0 ? "red" : "info", label: `${urgentCount} urgent case(s)` },
    { tone: "info", label: "0 literature records awaiting review" },
    { tone: "info", label: "0 submission reconciliation issues" },
  ];

  const sections = [
    {
      title: "Operational",
      metrics: [
        { label: "Cases received", value: cases.length },
        { label: "Cases pending", value: pendingCount },
        { label: "Cases ageing", value: "—" },
        { label: "Cases due", value: "—" },
        { label: "Cases overdue", value: "—" },
      ],
    },
    {
      title: "Regulatory",
      metrics: [
        { label: "Submissions", value: "—" },
        { label: "Errors", value: "—" },
        { label: "Acknowledgements", value: "—" },
        { label: "Reconciliation", value: "—" },
      ],
    },
    {
      title: "Safety",
      metrics: [
        { label: "Serious cases", value: seriousCount },
        { label: "Emerging patterns", value: "—" },
        { label: "Signals", value: "—" },
        { label: "Literature", value: "—" },
      ],
    },
    {
      title: "Quality",
      metrics: [
        { label: "QC", value: "—" },
        { label: "CAPA", value: "—" },
        { label: "Audits", value: "—" },
        { label: "Training", value: "—" },
      ],
    },
    {
      title: "Intelligence",
      metrics: [
        { label: "Safety Pulse", value: "—" },
        { label: "Safety Graph", value: "—" },
        { label: "AI recommendations", value: "—" },
      ],
    },
  ];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-navy-900">Safety Command Center</h1>
        <p className="text-sm text-navy-600">
          Signed in as {user?.email ?? "unknown"} — Operational/Safety figures reflect real case
          data (Phase 1a); Regulatory/Quality/Intelligence populate as those phases are built.
        </p>
      </header>

      <section className="pv-card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
          Safety Pulse
        </h2>
        <ul className="flex flex-wrap gap-2">
          {pulse.map((item) => (
            <li key={item.label} className={`pv-badge ${toneClass[item.tone]}`}>
              {item.label}
            </li>
          ))}
          <li className="pv-badge bg-navy-50 text-navy-600">PV Health Score: — /100</li>
        </ul>
        <p className="mt-2 text-xs text-navy-600">
          PV Health Score is an operational management indicator, not a regulatory certification.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="pv-card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.metrics.map((metric) => (
                <li key={metric.label} className="flex items-center justify-between text-sm">
                  <span className="text-navy-900">{metric.label}</span>
                  <span className="font-mono text-navy-600">{metric.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
