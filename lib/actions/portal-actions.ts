"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkAllRequiredStepsComplete, getSnapshotSteps, notifyProviderOfCompletion } from "@/lib/portal/shared";

const SubmitStepSchema = z.object({
  token: z.string().length(64),
  step_id: z.string().uuid(),
  value_text: z.string().optional(),
  value_json: z.union([z.string(), z.array(z.string())]).optional(),
});

export type SubmitStepResult = {
  success: boolean;
  error?: string;
  allStepsComplete?: boolean;
};

export async function submitClientStep(input: unknown): Promise<SubmitStepResult> {
  const parsed = SubmitStepSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = createServiceRoleClient();

  // Manual token check — this stands in for RLS since this visitor has no auth session
  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, status, token_expires_at, template_id, template_snapshot")
    .eq("access_token", parsed.data.token)
    .single();

  if (!instance) return { success: false, error: "Invalid link." };
  if (new Date(instance.token_expires_at) < new Date()) {
    return { success: false, error: "This link has expired." };
  }
  if (instance.status === "completed") {
    return { success: false, error: "This onboarding is already complete." };
  }

  const snapshotSteps = getSnapshotSteps(instance.template_snapshot);
  const step = snapshotSteps?.find((candidate) => candidate.id === parsed.data.step_id);
  if (instance.template_snapshot && !snapshotSteps) return { success: false, error: "Invalid onboarding snapshot." };
  const { data: liveStep } = step || snapshotSteps ? { data: null } : await supabase
    .from("template_steps").select("id, type, is_required, validation_rules")
    .eq("id", parsed.data.step_id).eq("template_id", instance.template_id).single();
  const submittedStep = step ?? liveStep;
  if (!submittedStep) return { success: false, error: "Invalid onboarding step." };

  if (["short_text", "long_text"].includes(submittedStep.type)) {
    if (submittedStep.is_required && !parsed.data.value_text?.trim()) return { success: false, error: "This field is required." };
  } else if (submittedStep.type === "single_select") {
    const options = (submittedStep.validation_rules?.options as string[] | undefined) ?? [];
    if (typeof parsed.data.value_json !== "string" || !options.includes(parsed.data.value_json)) return { success: false, error: "Select a valid option." };
  } else if (submittedStep.type === "multi_select") {
    const options = (submittedStep.validation_rules?.options as string[] | undefined) ?? [];
    if (!Array.isArray(parsed.data.value_json) || parsed.data.value_json.length === 0 || parsed.data.value_json.some((value) => !options.includes(value))) return { success: false, error: "Select valid options." };
  } else {
    return { success: false, error: "This step cannot be submitted yet." };
  }

  if (instance.status === "active") {
    await supabase
      .from("client_instances")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", instance.id);
  }

  const { error: upsertError } = await supabase.from("client_submissions").upsert(
    {
      instance_id: instance.id,
      step_id: parsed.data.step_id,
      status: "submitted",
      value_text: parsed.data.value_text ?? null,
      value_json: parsed.data.value_json ?? null,
      submitted_at: new Date().toISOString(),
    },
    { onConflict: "instance_id,step_id" }
  );

  if (upsertError) return { success: false, error: upsertError.message };

  const allComplete = await checkAllRequiredStepsComplete(
    supabase,
    instance.id,
    instance.template_id,
    instance.template_snapshot
  );

  if (allComplete) {
    await supabase
      .from("client_instances")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", instance.id);
    await notifyProviderOfCompletion(supabase, instance.id);
  }

  revalidatePath(`/portal/${parsed.data.token}`);
  return { success: true, allStepsComplete: allComplete };
}
