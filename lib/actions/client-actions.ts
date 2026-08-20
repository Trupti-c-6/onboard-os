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

  try {
    const { subject, html } = clientInvitedEmail(
      org?.name ?? "your provider",
      portalUrl
    );

    // Make every email unique so repeated sends to the same
    // address are not grouped together by the email client.
    const uniqueSubject = `${subject} — ${Date.now()}`;

    const emailResult = await sendEmail(
      parsed.data.clientEmail,
      uniqueSubject,
      html
    );

    if (!emailResult.success) {
      console.error(
        "Client invitation email was not sent successfully."
      );
    }
  } catch (err) {
    // Email failure must not prevent the client link from being created.
    console.error("Failed to send client invitation email:", err);
  }

  return {
    success: true,
    message: "Client link created and emailed!",
    portalUrl,
  };
}