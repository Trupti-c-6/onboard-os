import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already protects /dashboard/*.
  // This also handles stale/expired sessions.
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(name)")
    .eq("id", user.id)
    .single();

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ??
    "Your Organization";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar orgName={orgName} />

      <main className="min-h-screen md:ml-64">
        {children}
      </main>
    </div>
  );
}