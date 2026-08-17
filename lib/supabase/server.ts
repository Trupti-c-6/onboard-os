import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// This client runs on the server and reads/writes the auth session via
// cookies, so a logged-in provider stays logged in across page loads.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes, where
            // cookies can't be mutated. Safe to ignore if middleware also
            // refreshes the session (we'll add that in Milestone 1's auth step).
          }
        },
      },
    }
  );
}

// A second client using the SERVICE ROLE key — this bypasses Row-Level
// Security entirely. Only ever use this in Server Actions, and only after
// manually verifying a client's access_token by hand (e.g. the public
// magic-link portal, where the visitor isn't logged in via Supabase Auth
// at all). NEVER import this file into browser/client code.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
