"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTemplateSchema } from "@/lib/actions/template-schemas";

export type CreateTemplateState = {
  success: boolean;
  message: string;
};

// Looks up the current logged-in provider's organization_id.
// Every write in this file is scoped to it — this is our multi-tenancy
// boundary enforced in application code, on top of the database RLS
// policies which enforce it again at the Postgres level (defense in depth).
async function getOrgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return { supabase, organizationId: profile.organization_id };
}

export async function createTemplate(
  _prevState: CreateTemplateState,
  formData: FormData
): Promise<CreateTemplateState> {
  const rawSteps = formData.get("steps_json");
  let stepsParsed: unknown = [];
  try {
    stepsParsed = JSON.parse(rawSteps as string);
  } catch {
    return { success: false, message: "Invalid step data — please try again." };
  }

  const parsed = CreateTemplateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    steps: stepsParsed,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const { supabase, organizationId } = await getOrgId();

  // 1. Create the template shell
  const { data: template, error: templateError } = await supabase
    .from("workflow_templates")
    .insert({
      organization_id: organizationId,
      title: parsed.data.title,
      description: parsed.data.description || null,
    })
    .select("id")
    .single();

  if (templateError || !template) {
    return { success: false, message: templateError?.message ?? "Failed to create template." };
  }

  // 2. Insert all steps, tagged with their order (0, 1, 2...)
  const stepsToInsert = parsed.data.steps.map((step, index) => ({
    template_id: template.id,
    step_order: index,
    title: step.title,
    description: step.description || null,
    type: step.type,
    is_required: step.is_required,
    // This is the actual fix: validation_rules was previously never
    // written here, so every single_select/multi_select step silently
    // saved with zero options, and file_upload steps saved with no
    // accepted_types/max_size_bytes — even though the client portal
    // (SelectInput.tsx, FileUploadInput.tsx) already reads this column
    // correctly. Nothing on the read side needed to change.
    validation_rules: step.validation_rules ?? {},
  }));

  const { error: stepsError } = await supabase.from("template_steps").insert(stepsToInsert);

  if (stepsError) {
    // Roll back the orphaned template so we don't leave a broken shell behind
    await supabase.from("workflow_templates").delete().eq("id", template.id);
    return { success: false, message: stepsError.message };
  }

  revalidatePath("/dashboard/templates");
  redirect("/dashboard/templates");
}

export async function deleteTemplate(templateId: string) {
  const { supabase } = await getOrgId();
  // RLS ensures this only succeeds if the template belongs to our org,
  // even if someone tampered with the templateId client-side.
  await supabase.from("workflow_templates").delete().eq("id", templateId);
  revalidatePath("/dashboard/templates");
}

// Non-destructive alternative to delete, and the one actually exposed on
// the dashboard. A template may already have client_instances pointing at
// it (client_instances.template_id), so we never delete — we just flip
// is_active so it stops appearing as an option for NEW client onboarding
// while every existing client instance keeps working exactly as before.
export async function archiveTemplate(templateId: string, archive: boolean) {
  const { supabase } = await getOrgId();
  // RLS scopes this to our own org's templates regardless of what
  // templateId the client sent.
  await supabase
    .from("workflow_templates")
    .update({ is_active: !archive, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  revalidatePath("/dashboard/templates");
}

// Creates a fully independent copy: new template row, new template_steps
// rows (new IDs), same title/description/type/is_required/validation_rules
// (so options and file config carry over). Deliberately does NOT touch
// client_instances or client_submissions — those belong to the original
// template's history, not the copy. The duplicate is a blank-slate reusable
// blueprint, exactly like a freshly created template.
export async function duplicateTemplate(templateId: string) {
  const { supabase, organizationId } = await getOrgId();

  // Load the source template + its steps. RLS (organization_id = our org)
  // means this silently returns nothing if the ID belongs to another org —
  // the explicit .eq("organization_id", ...) below is a second, explicit
  // check on top of that, not a replacement for it.
  const { data: source } = await supabase
    .from("workflow_templates")
    .select("id, title, description")
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .single();

  if (!source) return { success: false, message: "Template not found." };

  const { data: sourceSteps } = await supabase
    .from("template_steps")
    .select("step_order, title, description, type, is_required, validation_rules")
    .eq("template_id", templateId)
    .order("step_order", { ascending: true });

  const { data: newTemplate, error: templateError } = await supabase
    .from("workflow_templates")
    .insert({
      organization_id: organizationId,
      title: `${source.title} (Copy)`,
      description: source.description,
    })
    .select("id")
    .single();

  if (templateError || !newTemplate) {
    return { success: false, message: templateError?.message ?? "Failed to duplicate template." };
  }

  if (sourceSteps && sourceSteps.length > 0) {
    const stepsToInsert = sourceSteps.map((step) => ({
      template_id: newTemplate.id,
      step_order: step.step_order,
      title: step.title,
      description: step.description,
      type: step.type,
      is_required: step.is_required,
      validation_rules: step.validation_rules,
    }));

    const { error: stepsError } = await supabase.from("template_steps").insert(stepsToInsert);
    if (stepsError) {
      // Roll back the orphaned copy rather than leaving a template with no steps
      await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
      return { success: false, message: stepsError.message };
    }
  }

  revalidatePath("/dashboard/templates");
  return { success: true, message: "Template duplicated." };
}