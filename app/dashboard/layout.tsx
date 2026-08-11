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

  // Belt-and-suspenders: middleware already guards /dashboard/*, but this
  // catches the case of a stale/expired session slipping through.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(name)")
    .eq("id", user.id)
    .single();

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ?? "Your Organization";

  return (
    <div className="flex">
      <Sidebar orgName={orgName} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
