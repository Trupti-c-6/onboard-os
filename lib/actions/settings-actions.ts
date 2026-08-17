"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BrandingSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  logoUrl: z.string().trim().url("Enter a valid URL").or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0f172a"),
  supportEmail: z.string().email("Enter a valid email").or(z.literal("")),
});

export type UpdateBrandingState = { success: boolean; message: string };

export async function updateOrganizationBranding(
  _prevState: UpdateBrandingState,
  formData: FormData
): Promise<UpdateBrandingState> {
  const parsed = BrandingSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl") ?? "",
    brandColor: formData.get("brandColor"),
    supportEmail: formData.get("supportEmail") ?? "",
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
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  if (profile.role !== "owner" && profile.role !== "admin") {
    return { success: false, message: "Only owners and admins can update company settings." };
  }

  // RLS scopes this update to the caller's own organization_id regardless,
  // but the explicit .eq() keeps intent obvious and gives us a real filter
  // to reason about rather than relying on RLS alone.
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      logo_url: parsed.data.logoUrl || null,
      brand_color: parsed.data.brandColor,
      support_email: parsed.data.supportEmail || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.organization_id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true, message: "Company settings saved." };
}
