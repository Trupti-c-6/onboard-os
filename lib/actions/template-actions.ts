"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const StepInputSchema = z.object({
  title: z.string().min(1, "Step title is required"),
  description: z.string().optional(),
  type: z.enum([
    "short_text",
    "long_text",
    "single_select",
    "multi_select",
    "file_upload",
    "credential",
    "e_sign",
  ]),
  is_required: z.boolean().default(true),
});

const CreateTemplateSchema = z.object({
  title: z.string().min(1, "Template title is required"),
  description: z.string().optional(),
  steps: z.array(StepInputSchema).min(1, "Add at least one step"),
});

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
