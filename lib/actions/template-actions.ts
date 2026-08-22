"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTemplateSchema, sanitizeStepForType } from "@/lib/actions/template-schemas";
import { isOwnedCustomTemplate, ownedTemplateCopyFields } from "@/lib/templates/classification";

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
  const steps = parsed.data.steps.map((step) => sanitizeStepForType(step));

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
  const stepsToInsert = steps.map((step, index) => ({
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

export async function updateTemplate(
  _prevState: CreateTemplateState,
  formData: FormData
): Promise<CreateTemplateState> {
  const templateId = String(formData.get("template_id") ?? "");
  let stepsParsed: unknown = [];
  try {
    stepsParsed = JSON.parse(String(formData.get("steps_json") ?? "[]"));
  } catch {
    return { success: false, message: "Invalid step data — please try again." };
  }
  const parsed = CreateTemplateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    steps: stepsParsed,
  });
  if (!parsed.success || !templateId) {
    return { success: false, message: parsed.success ? "Template not found." : parsed.error.issues[0].message };
  }

  const { supabase } = await getOrgId();
  const steps = parsed.data.steps.map((step) => sanitizeStepForType(step));
  const { error: updateError } = await supabase.rpc("update_template_atomic", {
    p_template_id: templateId,
    p_title: parsed.data.title,
    p_description: parsed.data.description || null,
    p_steps: steps,
  });
  if (updateError) return { success: false, message: updateError.message };

  revalidatePath("/dashboard/templates");
  revalidatePath(`/dashboard/templates/${templateId}`);
  return { success: true, message: "Template saved." };
}

export async function deleteTemplate(templateId: string) {
  const { supabase, organizationId } = await getOrgId();
  const { data: template } = await supabase
    .from("workflow_templates")
    .select("id, organization_id, is_starter")
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .eq("is_starter", false)
    .single();
  if (!template || !isOwnedCustomTemplate(template, organizationId)) return { success: false, message: "Template not found." };

  const { count: activeInstances } = await supabase
    .from("client_instances")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)
    .in("status", ["active", "in_progress", "submitted", "in_review"]);

  if ((activeInstances ?? 0) > 0) {
    await supabase.from("workflow_templates").update({ is_active: false, status: "archived", updated_at: new Date().toISOString() }).eq("id", templateId);
    revalidatePath("/dashboard/templates");
    return { success: true, message: "Template archived because it is used by active client workflows." };
  }

  await supabase.from("workflow_templates").delete().eq("id", templateId);
  revalidatePath("/dashboard/templates");
  return { success: true, message: "Template deleted." };
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
    .select("id, organization_id, title, description, category, is_starter, slug, subcategory, purpose, target_provider, tier, priority, estimated_minutes, sensitive_data_level, technical, document_heavy, approval_required, access_required, cadence, audience, tags, jurisdiction, version, status")
    .eq("id", templateId)
    .single();

  if (!source || (!source.is_starter && source.organization_id !== organizationId)) {
    return { success: false, message: "Template not found." };
  }

  const { data: sourceSteps } = await supabase
    .from("template_steps")
    .select("id, step_order, title, description, type, is_required, validation_rules, stage_id, component_id, provider_rationale, sensitivity, prompt, helper_text, example_answer")
    .eq("template_id", templateId)
    .order("step_order", { ascending: true });

  const { data: sourceStages } = await supabase
    .from("workflow_template_stages")
    .select("id, name, description, stage_order, visibility, completion_rule")
    .eq("template_id", templateId)
    .order("stage_order", { ascending: true });

  const { data: newTemplate, error: templateError } = await supabase
    .from("workflow_templates")
    .insert({
      ...ownedTemplateCopyFields(source.category, organizationId),
      title: `${source.title} (Copy)`,
      description: source.description,
      slug: source.slug ? `${source.slug}-copy` : null,
      subcategory: source.subcategory,
      purpose: source.purpose,
      target_provider: source.target_provider,
      tier: source.tier,
      priority: source.priority,
      estimated_minutes: source.estimated_minutes,
      sensitive_data_level: source.sensitive_data_level,
      technical: source.technical,
      document_heavy: source.document_heavy,
      approval_required: source.approval_required,
      access_required: source.access_required,
      cadence: source.cadence,
      audience: source.audience,
      tags: source.tags,
      jurisdiction: source.jurisdiction,
      version: 1,
      status: "active",
    })
    .select("id")
    .single();

  if (templateError || !newTemplate) {
    return { success: false, message: templateError?.message ?? "Failed to duplicate template." };
  }

  const stageMap = new Map<string, string>();
  if (sourceStages && sourceStages.length > 0) {
    const { data: newStages, error: stagesError } = await supabase
      .from("workflow_template_stages")
      .insert(sourceStages.map((stage) => ({
        template_id: newTemplate.id,
        name: stage.name,
        description: stage.description,
        stage_order: stage.stage_order,
        visibility: stage.visibility,
        completion_rule: stage.completion_rule,
      })))
      .select("id, stage_order");
    if (stagesError || !newStages) {
      await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
      return { success: false, message: stagesError?.message ?? "Failed to duplicate template stages." };
    }
    sourceStages.forEach((stage) => {
      const copy = newStages.find((item) => item.stage_order === stage.stage_order);
      if (copy) stageMap.set(stage.id, copy.id);
    });
  }

  const stepMap = new Map<string, string>();
  if (sourceSteps && sourceSteps.length > 0) {
    const stepsToInsert = sourceSteps.map((step) => ({
      template_id: newTemplate.id,
      step_order: step.step_order,
      title: step.title,
      description: step.description,
      type: step.type,
      is_required: step.is_required,
      validation_rules: step.validation_rules,
      stage_id: step.stage_id ? stageMap.get(step.stage_id) ?? null : null,
      component_id: step.component_id,
      provider_rationale: step.provider_rationale,
      sensitivity: step.sensitivity,
      prompt: step.prompt,
      helper_text: step.helper_text,
      example_answer: step.example_answer,
    }));

    const { data: newSteps, error: stepsError } = await supabase.from("template_steps").insert(stepsToInsert).select("id, step_order");
    if (stepsError || !newSteps) {
      // Roll back the orphaned copy rather than leaving a template with no steps
      await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
      return { success: false, message: stepsError.message };
    }
    sourceSteps.forEach((step) => {
      const copy = newSteps.find((item) => item.step_order === step.step_order);
      if (copy) stepMap.set(step.id, copy.id);
    });
  }

  if (sourceSteps && sourceSteps.length > 0) {
    const sourceStepIds = sourceSteps.map((step) => step.id);
    const { data: options } = await supabase.from("step_options").select("step_id, label, value, option_order").in("step_id", sourceStepIds);
    if (options?.length) {
      const { error } = await supabase.from("step_options").insert(options.map((option) => ({ ...option, step_id: stepMap.get(option.step_id) })));
      if (error) {
        await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
        return { success: false, message: error.message };
      }
    }

    const { data: conditions } = await supabase.from("workflow_conditions").select("source_step_id, operator, value, target_step_id, action").in("source_step_id", sourceStepIds);
    if (conditions?.length) {
      const { error } = await supabase.from("workflow_conditions").insert(conditions.map((condition) => ({ ...condition, source_step_id: stepMap.get(condition.source_step_id), target_step_id: stepMap.get(condition.target_step_id) })));
      if (error) {
        await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
        return { success: false, message: error.message };
      }
    }
  }

  if (sourceStages && sourceStages.length > 0) {
    const sourceStageIds = sourceStages.map((stage) => stage.id);
    const { data: documents } = await supabase.from("document_requests").select("stage_id, name, description, accepted_types, max_files, max_size_bytes, is_required, sensitivity, due_rule, review_status").in("stage_id", sourceStageIds);
    if (documents?.length) {
      const { error } = await supabase.from("document_requests").insert(documents.map((document) => ({ ...document, stage_id: stageMap.get(document.stage_id) })));
      if (error) {
        await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
        return { success: false, message: error.message };
      }
    }

    const { data: approvals } = await supabase.from("approval_gates").select("stage_id, approver_role, approval_type, is_required, rejection_behavior").in("stage_id", sourceStageIds);
    if (approvals?.length) {
      const { error } = await supabase.from("approval_gates").insert(approvals.map((approval) => ({ ...approval, stage_id: stageMap.get(approval.stage_id) })));
      if (error) {
        await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
        return { success: false, message: error.message };
      }
    }

    const { data: dependencies } = await supabase.from("workflow_dependencies").select("stage_id, depends_on_stage_id, condition, blocking").in("stage_id", sourceStageIds);
    if (dependencies?.length) {
      const { error } = await supabase.from("workflow_dependencies").insert(dependencies.map((dependency) => ({ ...dependency, stage_id: stageMap.get(dependency.stage_id), depends_on_stage_id: stageMap.get(dependency.depends_on_stage_id) })));
      if (error) {
        await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
        return { success: false, message: error.message };
      }
    }
  }

  revalidatePath("/dashboard/templates");
  const { error: versionError } = await supabase.from("workflow_template_versions").insert({
    template_id: newTemplate.id,
    version: 1,
    snapshot: { source_template_id: templateId, source_version: source.version ?? 1, copied_at: new Date().toISOString() },
  });
  if (versionError) {
    await supabase.from("workflow_templates").delete().eq("id", newTemplate.id);
    return { success: false, message: versionError.message };
  }
  return { success: true, message: "Template duplicated.", templateId: newTemplate.id };
}