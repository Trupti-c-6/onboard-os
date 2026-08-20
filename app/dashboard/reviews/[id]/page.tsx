import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SubmissionReviewCard,
  type ReviewSubmission,
} from "@/components/review-queue/SubmissionReviewCard";
import { StatusTimeline } from "@/components/review-queue/StatusTimeline";
import { AiSummaryCard } from "@/components/review-queue/AiSummaryCard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, client_name, client_email, status, access_token, template_id, ai_summary")
    .eq("id", id)
    .single();

  if (!instance) redirect("/dashboard/reviews");

  const { data: history } = await supabase
    .from("instance_status_history")
    .select("id, from_status, to_status, created_at")
    .eq("instance_id", instance.id)
    .order("created_at", { ascending: true });

  const { data: steps } = await supabase
    .from("template_steps")
    .select("id, title, type")
    .eq("template_id", instance.template_id)
    .order("step_order", { ascending: true });

  const { data: submissions } = await supabase
    .from("client_submissions")
    .select("id, step_id, status, value_text, value_json")
    .eq("instance_id", instance.id);

  const submissionIds = (submissions ?? []).map((s) => s.id);

  const { data: assets } =
    submissionIds.length > 0
      ? await supabase
          .from("submission_assets")
          .select("id, file_name, submission_id")
          .in("submission_id", submissionIds)
      : { data: [] };

  const stepsById = new Map((steps ?? []).map((s) => [s.id, s]));
  const assetsBySubmission = new Map<string, { id: string; file_name: string }[]>();
  (assets ?? []).forEach((a) => {
    const list = assetsBySubmission.get(a.submission_id) ?? [];
    list.push({ id: a.id, file_name: a.file_name });
    assetsBySubmission.set(a.submission_id, list);
  });

  const reviewItems: ReviewSubmission[] = (submissions ?? []).map((s) => {
    const step = stepsById.get(s.step_id);
    return {
      id: s.id,
      stepTitle: step?.title ?? "Unknown step",
      stepType: step?.type ?? "short_text",
      status: s.status,
      value_text: s.value_text,
      value_json: s.value_json,
      assets: assetsBySubmission.get(s.id) ?? [],
    };
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{instance.client_name}</CardTitle>
            <CardDescription>{instance.client_email}</CardDescription>
          </CardHeader>
        </Card>

        <AiSummaryCard summary={instance.ai_summary} />

        <div className="space-y-3">
          {reviewItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            reviewItems.map((item) => (
              <SubmissionReviewCard
                key={item.id}
                submission={item}
                instanceId={instance.id}
                instanceToken={instance.access_token}
              />
            ))
          )}
        </div>

        <StatusTimeline events={history ?? []} />
      </div>
    </div>
  );
}