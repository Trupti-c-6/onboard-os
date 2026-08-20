import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileStack, Inbox, Users, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const [{ count: templateCount }, { count: pendingReviewCount }, { count: activeClientCount }, { count: completedCount }] =
    await Promise.all([
      supabase.from("workflow_templates").select("id", { count: "exact", head: true }),
      supabase
        .from("client_instances")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "in_review"]),
      supabase
        .from("client_instances")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "in_progress"]),
      supabase
        .from("client_instances")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);

  const stats = [
    { label: "Templates", value: templateCount ?? 0, icon: FileStack },
    { label: "Awaiting Review", value: pendingReviewCount ?? 0, icon: Inbox },
    { label: "In Progress", value: activeClientCount ?? 0, icon: Users },
    { label: "Completed", value: completedCount ?? 0, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ""} 👋
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Logged in as {profile?.email}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <s.icon className="mb-2 h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-2xl">{s.value}</CardTitle>
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}