"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend-client";
import { clientInvitedEmail } from "@/lib/email/templates";

const CreateInstanceSchema = z.object({
  templateId: z.string().uuid(),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Enter a valid email"),
});

export type CreateInstanceState = {
  success: boolean;
  message: string;
  portalUrl?: string;
};

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

  // Create a NEW client instance every time.
  // There is intentionally NO check for an existing client email.
  const { data: instance, error } = await supabase
    .from("client_instances")
    .insert({
      organization_id: profile.organization_id,
      template_id: parsed.data.templateId,
      client_name: parsed.data.clientName,
      client_email: parsed.data.clientEmail,
    })
    .select("access_token")
    .single();

  if (error || !instance) {
    return {
      success: false,
      message:
        error?.message ?? "Could not create client link.",
    };
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${instance.access_token}`;

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id)
    .single();

  const { subject, html } = clientInvitedEmail(
    org?.name ?? "your provider",
    portalUrl
  );

  // Distinct subject per instance so repeated invites to the same address
  // are less likely to be grouped confusingly by email clients.
  const uniqueSubject = `${subject} (${instance.access_token.slice(0, 8)})`;

  const emailResult = await sendEmail(
    parsed.data.clientEmail,
    uniqueSubject,
    html
  );

  if (emailResult.success) {
    return {
      success: true,
      message: "Client link created and invitation email sent!",
      portalUrl,
    };
  }

  console.error(
    "Client invitation email was not sent:",
    emailResult.error ?? "Unknown error"
  );

  return {
    success: true,
    message:
      "Client link created, but the email could not be sent. Share the link below manually.",
    portalUrl,
  };
}