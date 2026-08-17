"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkAllRequiredStepsComplete, notifyProviderOfCompletion } from "@/lib/portal/shared";

const BUCKET = "onboarding-assets";

const SignedUrlSchema = z.object({
  token: z.string().length(64),
  stepId: z.string().uuid(),
  fileName: z.string().min(1),
});

export type SignedUrlResult =
  | { success: true; path: string; uploadToken: string }
  | { success: false; error: string };

// Step 1 of the upload: verify the client's token, then ask Supabase Storage
// for a short-lived signed upload slot. The actual file bytes never touch
// our server — the browser uploads them straight to Supabase Storage next.
export async function getSignedUploadUrl(input: unknown): Promise<SignedUrlResult> {
  const parsed = SignedUrlSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = createServiceRoleClient();

  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, organization_id, token_expires_at")
    .eq("access_token", parsed.data.token)
    .single();

  if (!instance) return { success: false, error: "Invalid link." };
  if (new Date(instance.token_expires_at) < new Date()) {
    return { success: false, error: "This link has expired." };
  }

  // Path convention: {org}/{instance}/{step}-{timestamp}-{filename}
  // Sanitized so a malicious filename can't escape the folder structure.
  const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${instance.organization_id}/${instance.id}/${parsed.data.stepId}-${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error || !data) {
    return { success: false, error: error?.message ?? "Could not create upload URL." };
  }

  return { success: true, path: data.path, uploadToken: data.token };
}

const RegisterAssetSchema = z.object({
  token: z.string().length(64),
  stepId: z.string().uuid(),
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  mimeType: z.string().min(1),
});

export type RegisterAssetResult = {
  success: boolean;
  error?: string;
  allStepsComplete?: boolean;
};

// Step 2 of the upload: the file bytes are already safely in Storage. Now
// we record the metadata and mark this step as submitted.
export async function registerSubmissionAsset(input: unknown): Promise<RegisterAssetResult> {
  const parsed = RegisterAssetSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const supabase = createServiceRoleClient();

  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, organization_id, template_id, status")
    .eq("access_token", parsed.data.token)
    .single();

  if (!instance) return { success: false, error: "Invalid link." };

  // Authorization check: the client only tells us the storage path so we
  // can register metadata (the bytes are already uploaded by this point),
  // but we never trust it blindly — it must live inside this instance's own
  // folder. Without this, a client could point storagePath at another
  // organization's file and get it attached to their own submission.
  const expectedPrefix = `${instance.organization_id}/${instance.id}/`;
  if (!parsed.data.storagePath.startsWith(expectedPrefix)) {
    return { success: false, error: "Invalid upload path." };
  }

  if (instance.status === "active") {
    await supabase.from("client_instances").update({ status: "in_progress" }).eq("id", instance.id);
  }

  const { data: submission, error: subError } = await supabase
    .from("client_submissions")
    .upsert(
      {
        instance_id: instance.id,
        step_id: parsed.data.stepId,
        status: "submitted",
        value_json: { file_name: parsed.data.fileName },
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "instance_id,step_id" }
    )
    .select("id")
    .single();

  if (subError || !submission) {
    return { success: false, error: subError?.message ?? "Could not save submission." };
  }

  // Re-upload case: replace any previous asset attached to this submission
  // rather than accumulating duplicates.
  await supabase.from("submission_assets").delete().eq("submission_id", submission.id);

  const { error: assetError } = await supabase.from("submission_assets").insert({
    submission_id: submission.id,
    file_name: parsed.data.fileName,
    storage_path: parsed.data.storagePath,
    file_size_bytes: parsed.data.fileSizeBytes,
    mime_type: parsed.data.mimeType,
  });

  if (assetError) return { success: false, error: assetError.message };

  const allComplete = await checkAllRequiredStepsComplete(supabase, instance.id, instance.template_id);

  if (allComplete) {
    await supabase.from("client_instances").update({ status: "submitted" }).eq("id", instance.id);
    await notifyProviderOfCompletion(supabase, instance.id);
  }

  return { success: true, allStepsComplete: allComplete };
}
