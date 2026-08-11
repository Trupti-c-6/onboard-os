import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: instances } = await supabase
    .from("client_instances")
    .select("id, client_name, client_email, status, updated_at")
    .in("status", ["submitted", "in_review"])
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Review Queue</h1>

        {!instances || instances.length === 0 ? (
          <Card>
            <CardHeader className="items-center py-12 text-center">
              <Inbox className="mb-3 h-10 w-10 text-slate-300" />
              <CardTitle>All caught up!</CardTitle>
              <CardDescription>No pending submissions to review right now.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {instances.map((i) => (
              <Link key={i.id} href={`/dashboard/reviews/${i.id}`}>
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle>{i.client_name}</CardTitle>
                      <CardDescription>{i.client_email}</CardDescription>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium capitalize text-amber-700">
                      {i.status.replace("_", " ")}
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
