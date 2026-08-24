import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side Supabase client bound to the current request's session cookies.
 * All regulated reads/writes must go through this (never a client-side
 * privileged client) so that RLS evaluates against the real authenticated user.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component with no mutable cookie jar;
            // middleware handles session refresh in that case.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // See note above.
          }
        },
      },
    }
  );
}

export type SessionUser = {
  id: string;
  email: string | null;
  organizationId: string | null;
};

/**
 * Resolves the current user's identity AND tenant from the server-side
 * session — never from a client-supplied header/param. Returns null when
 * unauthenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    organizationId: profile?.organization_id ?? null,
  };
}
