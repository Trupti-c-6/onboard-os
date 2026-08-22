import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrandingForm } from "@/components/settings/BrandingForm";
import { resolveCompanyEmail } from "@/lib/settings/branding-defaults";

export default async function SettingsPage() {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, brand_color, support_email, website_url, industry, description, phone, whatsapp, contact_person, secondary_color, favicon_url, business_address, city, state_province, postal_code, country, business_hours, time_zone, linkedin_url, instagram_url, facebook_url, x_url")
    .eq("id", profile.organization_id)
    .single();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Company Profile &amp; Branding</h1>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Add the company details and branding your clients should see during their onboarding experience.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <BrandingForm
              initial={{
                name: org?.name ?? "",
                logoUrl: org?.logo_url ?? "",
                brandColor: org?.brand_color ?? "#0f172a",
                supportEmail: resolveCompanyEmail(org?.support_email, user.email),
                websiteUrl: org?.website_url ?? "",
                industry: org?.industry ?? "",
                description: org?.description ?? "",
                phone: org?.phone ?? "",
                whatsapp: org?.whatsapp ?? "",
                contactPerson: org?.contact_person ?? "",
                secondaryColor: org?.secondary_color ?? "",
                faviconUrl: org?.favicon_url ?? "",
                businessAddress: org?.business_address ?? "",
                city: org?.city ?? "",
                stateProvince: org?.state_province ?? "",
                postalCode: org?.postal_code ?? "",
                country: org?.country ?? "",
                businessHours: org?.business_hours ?? "",
                timeZone: org?.time_zone ?? "",
                linkedinUrl: org?.linkedin_url ?? "",
                instagramUrl: org?.instagram_url ?? "",
                facebookUrl: org?.facebook_url ?? "",
                xUrl: org?.x_url ?? "",
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}