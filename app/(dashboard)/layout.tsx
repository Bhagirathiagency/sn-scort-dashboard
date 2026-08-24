import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";

const NAV = [
  { label: "Safety Command Center", href: "/dashboard" },
  { label: "Case Worklist", href: "/dashboard/cases" },
  { label: "Signal Radar", href: "/dashboard/signals" },
  { label: "Literature", href: "/dashboard/literature" },
  { label: "Regulatory", href: "/dashboard/regulatory" },
  { label: "Quality", href: "/dashboard/quality" },
  { label: "Analytics", href: "/dashboard/analytics" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-navy-900 px-4 py-6">
        <div className="mb-8 px-2">
          <span className="text-xl font-semibold text-white">
            PV<span className="text-teal-500">+</span>
          </span>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-navy-100 hover:bg-navy-600 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-navy-50 px-8 py-6">{children}</main>
    </div>
  );
}
