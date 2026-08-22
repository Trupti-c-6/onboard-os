"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "company-logos";
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

export type LogoUploadState = { success: boolean; uploadToken?: string; path?: string; publicUrl?: string; message: string };

export async function createCompanyLogoUpload(fileName: string, contentType: string, fileSize?: number): Promise<LogoUploadState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("organization_id, role").eq("id", user.id).single();
  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) return { success: false, message: "You are not allowed to update company branding." };
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(contentType)) return { success: false, message: "Use a PNG, JPG, JPEG, WEBP, or SVG logo." };
  if (fileSize !== undefined && (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_LOGO_SIZE_BYTES)) return { success: false, message: "Logo must be smaller than 5 MB." };
  const path = `${profile.organization_id}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { data, error } = await createServiceRoleClient().storage.from(LOGO_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { success: false, message: error?.message ?? "Could not prepare logo upload." };
  return { success: true, uploadToken: data.token, path: data.path, publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`, message: "Logo ready to upload." };
}

const BrandingSchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  logoUrl: z.string().trim().url("Enter a valid URL").or(z.literal("")),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #0f172a"),
  supportEmail: z.string().email("Enter a valid email").or(z.literal("")),
  websiteUrl: z.string().trim().url("Enter a valid website URL").or(z.literal("")),
  industry: z.string().trim().max(255),
  description: z.string().trim().max(2000),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  contactPerson: z.string().trim().max(255),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7c3aed").or(z.literal("")),
  faviconUrl: z.string().trim().url("Enter a valid favicon URL").or(z.literal("")),
  businessAddress: z.string().trim().max(500), city: z.string().trim().max(120), stateProvince: z.string().trim().max(120), postalCode: z.string().trim().max(40), country: z.string().trim().max(120), businessHours: z.string().trim().max(255), timeZone: z.string().trim().max(120),
  linkedinUrl: z.string().trim().url("Enter a valid LinkedIn URL").or(z.literal("")), instagramUrl: z.string().trim().url("Enter a valid Instagram URL").or(z.literal("")), facebookUrl: z.string().trim().url("Enter a valid Facebook URL").or(z.literal("")), xUrl: z.string().trim().url("Enter a valid X URL").or(z.literal("")),
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
    websiteUrl: formData.get("websiteUrl") ?? "", industry: formData.get("industry") ?? "", description: formData.get("description") ?? "", phone: formData.get("phone") ?? "", whatsapp: formData.get("whatsapp") ?? "", contactPerson: formData.get("contactPerson") ?? "", secondaryColor: formData.get("secondaryColor") ?? "", faviconUrl: formData.get("faviconUrl") ?? "", businessAddress: formData.get("businessAddress") ?? "", city: formData.get("city") ?? "", stateProvince: formData.get("stateProvince") ?? "", postalCode: formData.get("postalCode") ?? "", country: formData.get("country") ?? "", businessHours: formData.get("businessHours") ?? "", timeZone: formData.get("timeZone") ?? "", linkedinUrl: formData.get("linkedinUrl") ?? "", instagramUrl: formData.get("instagramUrl") ?? "", facebookUrl: formData.get("facebookUrl") ?? "", xUrl: formData.get("xUrl") ?? "",
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
      website_url: parsed.data.websiteUrl || null, industry: parsed.data.industry || null, description: parsed.data.description || null, phone: parsed.data.phone || null, whatsapp: parsed.data.whatsapp || null, contact_person: parsed.data.contactPerson || null, secondary_color: parsed.data.secondaryColor || null, favicon_url: parsed.data.faviconUrl || null, business_address: parsed.data.businessAddress || null, city: parsed.data.city || null, state_province: parsed.data.stateProvince || null, postal_code: parsed.data.postalCode || null, country: parsed.data.country || null, business_hours: parsed.data.businessHours || null, time_zone: parsed.data.timeZone || null, linkedin_url: parsed.data.linkedinUrl || null, instagram_url: parsed.data.instagramUrl || null, facebook_url: parsed.data.facebookUrl || null, x_url: parsed.data.xUrl || null,
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
