import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SendToClientForm } from "@/components/workflow-builder/SendToClientForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: template } = await supabase
    .from("workflow_templates")
    .select("id, title, description")
    .eq("id", id)
    .single();

  if (!template) redirect("/dashboard/templates");

  const { data: steps } = await supabase
    .from("template_steps")
    .select("id, title, type, is_required")
    .eq("template_id", id)
    .order("step_order", { ascending: true });

  const { data: instances } = await supabase
    .from("client_instances")
    .select("id, client_name, client_email, status, created_at")
    .eq("template_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{template.title}</h1>
          {template.description && <p className="text-slate-500">{template.description}</p>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Steps ({steps?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-slate-600">
              {(steps ?? []).map((s) => (
                <li key={s.id}>
                  {s.title}{" "}
                  <span className="text-slate-400">
                    — {s.type}
                    {s.is_required ? " · required" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send to a client</CardTitle>
            <CardDescription>
              Generates a unique, no-login link for one specific client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendToClientForm templateId={template.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sent links ({instances?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!instances || instances.length === 0 ? (
              <p className="text-sm text-slate-400">No client links sent yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {instances.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between border-b border-slate-100 pb-2"
                  >
                    <span>
                      {i.client_name} · {i.client_email}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
