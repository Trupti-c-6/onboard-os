"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    return { success: false, message: parsed.error.issues[0].message };
  }

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

  // This insert relies on RLS (organization_id = get_auth_org_id()) to make
  // sure a provider can only create instances under their own template/org —
  // we're using the regular authenticated client here, not the service role.
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
    return { success: false, message: error?.message ?? "Could not create client link." };
  }

  const portalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/portal/${instance.access_token}`;
  return { success: true, message: "Client link created!", portalUrl };
}
