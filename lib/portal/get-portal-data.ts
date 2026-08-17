import { createServiceRoleClient } from "@/lib/supabase/server";
import type { PortalStep, PortalSubmission } from "./types";

export type PortalData =
  | {
      valid: true;
      instance: { id: string; client_name: string; status: string };
      template: { title: string; description: string | null };
      org: { name: string; logoUrl: string | null; brandColor: string; supportEmail: string | null };
      steps: PortalStep[];
      submissions: Record<string, PortalSubmission>;
    }
  | { valid: false; reason: "expired" | "not_found"; supportEmail?: string | null };

// This runs with the SERVICE ROLE client because the visitor here has no
// Supabase Auth session at all — they're identified purely by the token in
// the URL. We manually verify that token below; that check is the entire
// security boundary for this function.
export async function getPortalData(token: string): Promise<PortalData> {
  const supabase = createServiceRoleClient();

  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, client_name, status, token_expires_at, template_id, organization_id")
    .eq("access_token", token)
    .single();

  if (!instance) return { valid: false, reason: "not_found" };

  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, brand_color, support_email")
    .eq("id", instance.organization_id)
    .single();

  if (new Date(instance.token_expires_at) < new Date()) {
    return { valid: false, reason: "expired", supportEmail: org?.support_email ?? null };
  }

  const { data: template } = await supabase
    .from("workflow_templates")
    .select("title, description")
    .eq("id", instance.template_id)
    .single();

  const { data: steps } = await supabase
    .from("template_steps")
    .select("id, step_order, title, description, type, is_required, validation_rules")
    .eq("template_id", instance.template_id)
    .order("step_order", { ascending: true });

  const { data: submissionsRaw } = await supabase
    .from("client_submissions")
    .select("step_id, status, value_text, value_json")
    .eq("instance_id", instance.id);

  const submissions: Record<string, PortalSubmission> = {};
  (submissionsRaw ?? []).forEach((s) => {
    submissions[s.step_id] = {
      status: s.status,
      value_text: s.value_text,
      value_json: s.value_json,
    };
  });

  return {
    valid: true,
    instance: { id: instance.id, client_name: instance.client_name, status: instance.status },
    template: template ?? { title: "Onboarding", description: null },
    org: {
      name: org?.name ?? "Your provider",
      logoUrl: org?.logo_url ?? null,
      brandColor: org?.brand_color ?? "#0f172a",
      supportEmail: org?.support_email ?? null,
    },
    steps: (steps ?? []) as PortalStep[],
    submissions,
  };
}
