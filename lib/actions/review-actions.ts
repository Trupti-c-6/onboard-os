"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email/resend-client";
import { stepRejectedEmail } from "@/lib/email/templates";

async function requireProviderOrgId() {
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

// Generates a short-lived (15 min) URL to view a private file. We use the
// service role client here rather than storage RLS policies, but we
// manually re-check that the asset actually belongs to this provider's
// organization first — that check is the real security boundary.
export async function getSignedAssetUrl(assetId: string) {
  const { supabase, organizationId } = await requireProviderOrgId();

  const { data: asset } = await supabase
    .from("submission_assets")
    .select(
      "storage_path, client_submissions!inner(instance_id, client_instances!inner(organization_id))"
    )
    .eq("id", assetId)
    .single();

  const ownerOrgId = (
    asset?.client_submissions as unknown as {
      client_instances: { organization_id: string };
    }
  )?.client_instances?.organization_id;

  if (!asset || ownerOrgId !== organizationId) {
    return { success: false as const, error: "File not found." };
  }

  const serviceClient = createServiceRoleClient();
  const { data, error } = await serviceClient.storage
    .from("onboarding-assets")
    .createSignedUrl(asset.storage_path, 900); // 15 minutes, per NFR-02

  if (error || !data) {
    return { success: false as const, error: error?.message ?? "Could not generate link." };
  }

  return { success: true as const, url: data.signedUrl };
}

export async function approveSubmission(submissionId: string, instanceToken: string) {
  const { supabase } = await requireProviderOrgId();

  // RLS on client_submissions ensures this only succeeds within our own org
  await supabase
    .from("client_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", submissionId);

  revalidatePath(`/dashboard/reviews`);
  revalidatePath(`/portal/${instanceToken}`);
}

const RejectSchema = z.object({
  submissionId: z.string().uuid(),
  instanceId: z.string().uuid(),
  instanceToken: z.string(),
  reason: z.string().min(1, "A reason is required so the client knows what to fix"),
});

export type RejectState = { success: boolean; message: string };

export async function rejectSubmission(
  _prevState: RejectState,
  formData: FormData
): Promise<RejectState> {
  const parsed = RejectSchema.safeParse({
    submissionId: formData.get("submissionId"),
    instanceId: formData.get("instanceId"),
    instanceToken: formData.get("instanceToken"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const { supabase } = await requireProviderOrgId();

  await supabase
    .from("client_submissions")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.submissionId);

  // Unlock the whole instance so the client can get back into the portal
  // and fix the rejected step, per our state engine rules (Part 11).
  await supabase
    .from("client_instances")
    .update({ status: "in_progress" })
    .eq("id", parsed.data.instanceId)
    .in("status", ["submitted", "in_review"]);

  const { data: instance } = await supabase
    .from("client_instances")
    .select("client_email, organization_id")
    .eq("id", parsed.data.instanceId)
    .single();

  if (instance) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", instance.organization_id)
      .single();

    const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${parsed.data.instanceToken}`;
    const { subject, html } = stepRejectedEmail(
      org?.name ?? "your service provider",
      portalUrl,
      parsed.data.reason
    );
    await sendEmail(instance.client_email, subject, html);
  }

  revalidatePath(`/dashboard/reviews`);
  revalidatePath(`/portal/${parsed.data.instanceToken}`);

  return { success: true, message: "Feedback sent to client." };
}
