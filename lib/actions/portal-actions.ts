"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkAllRequiredStepsComplete } from "@/lib/portal/shared";

const SubmitStepSchema = z.object({
  token: z.string().length(64),
  step_id: z.string().uuid(),
  value_text: z.string().optional(),
  value_json: z.record(z.string(), z.unknown()).optional(),
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
    .select("id, status, token_expires_at, template_id")
    .eq("access_token", parsed.data.token)
    .single();

  if (!instance) return { success: false, error: "Invalid link." };
  if (new Date(instance.token_expires_at) < new Date()) {
    return { success: false, error: "This link has expired." };
  }
  if (instance.status === "completed") {
    return { success: false, error: "This onboarding is already complete." };
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
    instance.template_id
  );

  if (allComplete) {
    await supabase
      .from("client_instances")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", instance.id);
  }

  revalidatePath(`/portal/${parsed.data.token}`);
  return { success: true, allStepsComplete: allComplete };
}
