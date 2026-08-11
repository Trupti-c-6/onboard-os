import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirect(`${origin}${next}`);
    }
  }

  return redirect(
    `${origin}/login?error=Could%20not%20verify%20login%20link.%20Please%20request%20a%20new%20one.`
  );
}