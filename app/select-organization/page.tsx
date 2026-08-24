import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export default async function SelectOrganizationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, org_type")
    .order("name");

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-16">
      <h1 className="text-2xl font-semibold text-navy-900">Select organisation</h1>
      <p className="mt-1 text-sm text-navy-600">
        Choose the tenant workspace you want to work in.
      </p>

      <div className="mt-6 space-y-2">
        {organizations?.length ? (
          organizations.map((org) => (
            <form key={org.id} action="/dashboard">
              <button
                type="submit"
                className="pv-card flex w-full items-center justify-between px-4 py-3 text-left hover:border-teal"
              >
                <span className="font-medium text-navy-900">{org.name}</span>
                <span className="pv-badge bg-navy-50 text-navy-600 uppercase">{org.org_type}</span>
              </button>
            </form>
          ))
        ) : (
          <p className="text-sm text-navy-600">
            No organisations are provisioned for this account yet.
          </p>
        )}
      </div>
    </div>
  );
}
