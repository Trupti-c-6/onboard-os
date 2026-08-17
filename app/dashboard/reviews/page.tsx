import Link from "next/link";
import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReviewFilters } from "@/components/review-queue/ReviewFilters";

const STATUS_OPTIONS = ["submitted", "in_review", "completed", "stalled"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeStatuses: StatusFilter[] =
    status && STATUS_OPTIONS.includes(status as StatusFilter)
      ? [status as StatusFilter]
      : ["submitted", "in_review"];

  let query = supabase
    .from("client_instances")
    .select("id, client_name, client_email, status, updated_at")
    .in("status", activeStatuses)
    .order("updated_at", { ascending: false });

  // Search matches either name or email. PostgREST's .or() takes a raw
  // filter string, so we escape the characters that have special meaning
  // inside it (comma separates conditions, parens group them) to keep a
  // user's search text from being interpreted as extra filter syntax.
  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    const escaped = trimmedQuery.replace(/[,()]/g, "");
    query = query.or(`client_name.ilike.%${escaped}%,client_email.ilike.%${escaped}%`);
  }

  const { data: instances } = await query;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Review Queue</h1>

        <ReviewFilters
          statusOptions={STATUS_OPTIONS}
          activeStatus={status && STATUS_OPTIONS.includes(status as StatusFilter) ? status : "pending"}
          query={q ?? ""}
        />

        {!instances || instances.length === 0 ? (
          <Card className="mt-4">
            <CardHeader className="items-center py-12 text-center">
              <Inbox className="mb-3 h-10 w-10 text-slate-300" />
              <CardTitle>{trimmedQuery || status ? "No matches" : "All caught up!"}</CardTitle>
              <CardDescription>
                {trimmedQuery || status
                  ? "Try a different search or filter."
                  : "No pending submissions to review right now."}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
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
