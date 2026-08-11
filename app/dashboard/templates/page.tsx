import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileStack } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: templates } = await supabase
    .from("workflow_templates")
    .select("id, title, description, created_at, template_steps(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Onboarding Templates</h1>
          <Button asChild>
            <Link href="/dashboard/templates/new" className="gap-2">
              <Plus className="h-4 w-4" /> New Template
            </Link>
          </Button>
        </div>

        {!templates || templates.length === 0 ? (
          <Card>
            <CardHeader className="items-center text-center py-12">
              <FileStack className="mb-3 h-10 w-10 text-slate-300" />
              <CardTitle>No templates yet</CardTitle>
              <CardDescription>
                Create your first onboarding template to start sending magic links to clients.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle>{t.title}</CardTitle>
                  <CardDescription>
                    {t.description || "No description"} ·{" "}
                    {Array.isArray(t.template_steps) ? t.template_steps[0]?.count ?? 0 : 0} steps
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
