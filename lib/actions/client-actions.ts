"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend-client";
import { clientInvitedEmail } from "@/lib/email/templates";
import { getPortalUrl } from "@/lib/email/portal-url";

const CreateInstanceSchema = z.object({
  templateId: z.string().uuid(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email"),
});

export type CreateInstanceState = {
  success: boolean;
  message: string;
  portalUrl?: string;
  instanceId?: string;
  emailSent?: boolean;
};

async function sendInvitationEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instance: { id: string; access_token: string; client_name: string; client_email: string; template_name?: string },
  organizationId: string,
  providerEmail: string | null,
  template: { title: string; description: string | null; category: string | null; stepCount: number }
) {
  const portalUrl = getPortalUrl(instance.access_token);
  if (!portalUrl) return { success: false as const, error: "NEXT_PUBLIC_SITE_URL is missing or invalid.", portalUrl: undefined };
  const { data: org } = await supabase.from("organizations").select("name, logo_url, support_email, website_url, description, phone, whatsapp, contact_person, business_address, city, state_province, postal_code, country, business_hours, time_zone, linkedin_url, instagram_url, facebook_url, x_url").eq("id", organizationId).single();
  const { subject, html } = clientInvitedEmail({
    clientName: instance.client_name,
    templateName: template.title,
    templateDescription: template.description,
    category: template.category,
    stepCount: template.stepCount,
    company: { name: org?.name ?? "Your provider", website: org?.website_url, email: org?.support_email, phone: org?.phone, whatsapp: org?.whatsapp, contactPerson: org?.contact_person, logoUrl: org?.logo_url, address: org?.business_address, city: org?.city, stateProvince: org?.state_province, postalCode: org?.postal_code, country: org?.country, businessHours: org?.business_hours, timeZone: org?.time_zone, linkedin: org?.linkedin_url, instagram: org?.instagram_url, facebook: org?.facebook_url, x: org?.x_url },
  }, portalUrl);
  const result = await sendEmail(instance.client_email, `${subject} (${instance.access_token.slice(0, 8)})`, html, { replyTo: providerEmail ?? undefined });
  return { ...result, portalUrl };
}

export async function createClientInstance(
  _prevState: CreateInstanceState,
  formData: FormData
): Promise<CreateInstanceState> {
  const parsed = CreateInstanceSchema.safeParse({
    templateId: formData.get("templateId"),
    clientName: formData.get("clientName"),
    clientEmail: formData.get("clientEmail"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0].message,
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("workflow_templates")
    .select("id, title, description, category, version")
    .eq("id", parsed.data.templateId)
    .or(`and(organization_id.eq.${profile.organization_id},is_starter.eq.false),and(organization_id.is.null,is_starter.eq.true)`)
    .single();

  if (!template) {
    return { success: false, message: "Template not found or unavailable." };
  }

  const { data: templateSteps } = await supabase
    .from("template_steps")
    .select("id, step_order, title, description, type, is_required, validation_rules")
    .eq("template_id", template.id)
    .order("step_order", { ascending: true });

  const templateSnapshot = {
    template: { title: template.title, description: template.description, category: template.category, version: template.version },
    steps: templateSteps ?? [],
  };

  // Create a NEW client instance every time.
  // There is intentionally NO check for an existing client email.
  const { data: instance, error } = await supabase
    .from("client_instances")
    .insert({
      organization_id: profile.organization_id,
      template_id: parsed.data.templateId,
      template_snapshot: templateSnapshot,
      client_name: parsed.data.clientName,
      client_email: parsed.data.clientEmail,
    })
    .select("id, access_token")
    .single();

  if (error || !instance) {
    return {
      success: false,
      message:
        error?.message ?? "Could not create client link.",
    };
  }

  const emailResult = await sendInvitationEmail(supabase, { ...instance, client_name: parsed.data.clientName, client_email: parsed.data.clientEmail, template_name: template.title }, profile.organization_id, user.email ?? null, { title: template.title, description: template.description, category: template.category, stepCount: templateSteps?.length ?? 0 });

  if (emailResult.success) {
    return {
      success: true,
      message: "Client link created and email sent successfully.",
      portalUrl: emailResult.portalUrl,
      instanceId: instance.id,
      emailSent: true,
    };
  }

  console.error(
    "Client invitation email was not sent:",
    emailResult.error ?? "Unknown error"
  );

  return {
    success: true,
    message: "Client link created, but the email could not be sent. Check server logs for the provider error, or retry below.",
    portalUrl: emailResult.portalUrl,
    instanceId: instance.id,
    emailSent: false,
  };
}

export async function retryClientInvitationEmail(instanceId: string): Promise<CreateInstanceState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) redirect("/login");
  const { data: instance } = await supabase
    .from("client_instances")
    .select("id, access_token, client_name, client_email, template_id")
    .eq("id", instanceId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!instance) return { success: false, message: "Client link not found." };
  const { data: template } = await supabase.from("workflow_templates").select("title, description, category").eq("id", instance.template_id).single();
  const { count: stepCount } = await supabase.from("template_steps").select("id", { count: "exact", head: true }).eq("template_id", instance.template_id);
  const result = await sendInvitationEmail(supabase, { ...instance, template_name: template?.title }, profile.organization_id, user.email ?? null, { title: template?.title ?? "Onboarding", description: template?.description ?? null, category: template?.category ?? null, stepCount: stepCount ?? 0 });
  return {
    success: true,
    message: result.success ? "Client link created and email sent successfully." : "Client link created, but the email could not be sent. Check server logs for the provider error, or retry below.",
    portalUrl: result.portalUrl,
    instanceId: instance.id,
    emailSent: result.success,
  };
}