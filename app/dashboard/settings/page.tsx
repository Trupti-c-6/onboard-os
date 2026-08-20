import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrandingForm } from "@/components/settings/BrandingForm";

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
    .select("name, logo_url, brand_color, support_email")
    .eq("id", profile.organization_id)
    .single();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Company Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              This shows up on the client portal your clients see — logo, brand color, and where
              they can reach you if something looks wrong.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <BrandingForm
              initial={{
                name: org?.name ?? "",
                logoUrl: org?.logo_url ?? "",
                brandColor: org?.brand_color ?? "#0f172a",
                supportEmail: org?.support_email ?? "",
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}