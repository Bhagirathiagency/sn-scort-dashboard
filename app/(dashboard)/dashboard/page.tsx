import { getSessionUser } from "@/lib/supabase/server";

type PulseItem = {
  tone: "red" | "amber" | "info";
  label: string;
};

const PULSE: PulseItem[] = [
  { tone: "red", label: "0 urgent cases" },
  { tone: "amber", label: "0 cases approaching deadline" },
  { tone: "info", label: "0 literature records awaiting review" },
  { tone: "info", label: "0 submission reconciliation issues" },
];

const SECTIONS = [
  {
    title: "Operational",
    metrics: ["Cases received", "Cases pending", "Cases ageing", "Cases due", "Cases overdue"],
  },
  {
    title: "Regulatory",
    metrics: ["Submissions", "Errors", "Acknowledgements", "Reconciliation"],
  },
  {
    title: "Safety",
    metrics: ["Serious cases", "Emerging patterns", "Signals", "Literature"],
  },
  {
    title: "Quality",
    metrics: ["QC", "CAPA", "Audits", "Training"],
  },
  {
    title: "Intelligence",
    metrics: ["Safety Pulse", "Safety Graph", "AI recommendations"],
  },
];

const toneClass: Record<PulseItem["tone"], string> = {
  red: "bg-safe-red/10 text-safe-red",
  amber: "bg-safe-amber/10 text-safe-amber",
  info: "bg-teal-50 text-teal-600",
};

export default async function SafetyCommandCenterPage() {
  const user = await getSessionUser();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-navy-900">Safety Command Center</h1>
        <p className="text-sm text-navy-600">
          Signed in as {user?.email ?? "unknown"} — this is a Phase 0 shell; live metrics
          populate once the case, regulatory, signal, and quality domains (Phases 1–4) are built.
        </p>
      </header>

      <section className="pv-card mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
          Safety Pulse
        </h2>
        <ul className="flex flex-wrap gap-2">
          {PULSE.map((item) => (
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
        {SECTIONS.map((section) => (
          <div key={section.title} className="pv-card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-600">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.metrics.map((metric) => (
                <li key={metric} className="flex items-center justify-between text-sm">
                  <span className="text-navy-900">{metric}</span>
                  <span className="font-mono text-navy-600">—</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
