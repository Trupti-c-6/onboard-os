import type { SupabaseClient } from "@supabase/supabase-js";

// Used by both the text/select submission flow and the file upload flow so
// the "did the client finish everything required" logic only lives in one place.
export async function checkAllRequiredStepsComplete(
  supabase: SupabaseClient,
  instanceId: string,
  templateId: string
): Promise<boolean> {
  const { data: requiredSteps } = await supabase
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
