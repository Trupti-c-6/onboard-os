import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/resend-client";
import { onboardingSubmittedEmail } from "@/lib/email/templates";
import { summarizeSubmission } from "@/lib/ai/provider";
import type { PortalStep } from "./types";

export function getSnapshotSteps(snapshot: unknown): PortalStep[] | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const steps = (snapshot as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return null;
  const valid = steps.every((step) => {
    if (!step || typeof step !== "object") return false;
    const value = step as Partial<PortalStep>;
    return typeof value.id === "string" && typeof value.step_order === "number" &&
      typeof value.title === "string" && typeof value.type === "string" &&
      typeof value.is_required === "boolean";
  });
  return valid ? (steps as PortalStep[]) : null;
}

// Used by both the text/select submission flow and the file upload flow so
// the "did the client finish everything required" logic only lives in one place.
export async function checkAllRequiredStepsComplete(
  supabase: SupabaseClient,
  instanceId: string,
  templateId: string,
  templateSnapshot?: unknown
): Promise<boolean> {
  const snapshotSteps = getSnapshotSteps(templateSnapshot)?.filter((step) => step.is_required).map((step) => ({ id: step.id })) ?? null;
  const { data: requiredSteps } = snapshotSteps
    ? { data: snapshotSteps }
    : await supabase
        .from("template_steps")
        .select("id")
        .eq("template_id", templateId)
        .eq("is_required", true);

  const { data: submitted } = await supabase
    .from("client_submissions")
    .select("step_id")
    .eq("instance_id", instanceId)
    .eq("status", "submitted");

  const submittedIds = new Set((submitted ?? []).map((s: { step_id: string }) => s.step_id));
  return (requiredSteps ?? []).every((s: { id: string }) => submittedIds.has(s.id));
}

// Mirrors checkAllRequiredStepsComplete, but for the review side: have every
// required step been explicitly approved by the provider? Used to decide
// when an instance can move from submitted/in_review to completed.
export async function checkAllRequiredStepsApproved(
  supabase: SupabaseClient,
  instanceId: string,
  templateId: string,
  templateSnapshot?: unknown
): Promise<boolean> {
  const snapshotSteps = getSnapshotSteps(templateSnapshot)?.filter((step) => step.is_required).map((step) => ({ id: step.id })) ?? null;
  const { data: requiredSteps } = snapshotSteps
    ? { data: snapshotSteps }
    : await supabase
        .from("template_steps")
        .select("id")
        .eq("template_id", templateId)
        .eq("is_required", true);

  const { data: approved } = await supabase
    .from("client_submissions")
    .select("step_id")
    .eq("instance_id", instanceId)
    .eq("status", "approved");

  const approvedIds = new Set((approved ?? []).map((s: { step_id: string }) => s.step_id));
  return (requiredSteps ?? []).every((s: { id: string }) => approvedIds.has(s.id));
}


// Fired once a client has submitted everything required for a given
// instance. Emails the org's owner so a human actually finds out there's
// something to review, instead of it silently sitting in the queue. Also
// runs the AI summary (best-effort, no-op if no provider key configured)
// so the review page has something useful the moment the provider opens it.
export async function notifyProviderOfCompletion(
  supabase: SupabaseClient,
  instanceId: string
): Promise<void> {
  const { data: instance } = await supabase
    .from("client_instances")
    .select("client_name, organization_id, template_id")
    .eq("id", instanceId)
    .single();

  if (!instance) return;

  await generateAiSummary(supabase, instanceId, instance.client_name, instance.template_id);

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("organization_id", instance.organization_id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!ownerProfile?.email) return;

  const reviewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/reviews/${instanceId}`;
  const { subject, html } = onboardingSubmittedEmail(instance.client_name, reviewUrl);

  try {
    await sendEmail(ownerProfile.email, subject, html);
  } catch {
    // Don't let a failed notification email block the client's submission
    // from being recorded — the completion already happened; this is a
    // best-effort nudge to the provider, not a critical-path write.
  }
}

// Pulls the full submission (steps + answers + whether each has files),
// asks the AI provider abstraction for a summary, and stores the result on
// the instance. No-ops silently (leaves ai_summary NULL) if no provider key
// is configured or the call fails — see lib/ai/provider.ts for why that's
// the correct behavior here rather than an error.
async function generateAiSummary(
  supabase: SupabaseClient,
  instanceId: string,
  clientName: string,
  templateId: string
): Promise<void> {
  const { data: instance } = await supabase
    .from("client_instances")
    .select("template_snapshot")
    .eq("id", instanceId)
    .single();
  const snapshotSteps = getSnapshotSteps(instance?.template_snapshot);
  const { data: liveSteps } = snapshotSteps
    ? { data: null }
    : await supabase
        .from("template_steps")
        .select("id, title, type, is_required")
        .eq("template_id", templateId)
        .order("step_order", { ascending: true });
  const steps = snapshotSteps ?? liveSteps;

  if (!steps || steps.length === 0) return;

  const { data: submissions } = await supabase
    .from("client_submissions")
    .select("id, step_id, value_text, value_json")
    .eq("instance_id", instanceId);

  const submissionIds = (submissions ?? []).map((s: { id: string }) => s.id);
  const { data: assets } =
    submissionIds.length > 0
      ? await supabase.from("submission_assets").select("submission_id").in(
          "submission_id",
          submissionIds
        )
      : { data: [] as { submission_id: string }[] };

  const submissionsByStep = new Map((submissions ?? []).map((s) => [s.step_id, s]));
  const submissionIdsWithFiles = new Set(
    (assets ?? []).map((a: { submission_id: string }) => a.submission_id)
  );

  const input = steps.map(
    (step: { id: string; title: string; type: string; is_required: boolean }) => {
      const submission = submissionsByStep.get(step.id);
      return {
        title: step.title,
        type: step.type,
        isRequired: step.is_required,
        valueText: submission?.value_text ?? null,
        valueJson: submission?.value_json ?? null,
        hasFiles: submission ? submissionIdsWithFiles.has(submission.id) : false,
      };
    }
  );

  const result = await summarizeSubmission(clientName, input);
  if (!result) return;

  await supabase.from("client_instances").update({ ai_summary: result }).eq("id", instanceId);
}
