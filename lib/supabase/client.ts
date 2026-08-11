import { createBrowserClient } from "@supabase/ssr";

// This client is safe to use in the browser because it only ever uses the
// "anon" public key, which is designed to be public — actual data access
// is still enforced server-side by Row-Level Security (RLS) policies.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
