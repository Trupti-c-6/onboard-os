import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SendToClientForm } from "@/components/workflow-builder/SendToClientForm";
import { TemplateBuilderForm } from "@/components/workflow-builder/TemplateBuilderForm";
import { DuplicateTemplateButton } from "@/components/workflow-builder/DuplicateTemplateButton";
import { RESPONSE_TYPE_LABELS } from "@/lib/actions/template-schemas";
import { isStarterTemplate } from "@/lib/templates/classification";
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
    .select("id, organization_id, title, description, category, is_starter")
    .eq("id", id)
    .single();

  if (!template) redirect("/dashboard/templates");
  const isStarter = isStarterTemplate(template);

  const { data: steps } = await supabase
    .from("template_steps")
    .select("id, title, description, type, is_required, validation_rules")
    .eq("template_id", id)
    .order("step_order", { ascending: true });

  const { data: instances } = await supabase
    .from("client_instances")
    .select("id, client_name, client_email, status, created_at")
    .eq("template_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{template.title}</h1>
          {template.description && <p className="text-muted-foreground">{template.description}</p>}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-violet-300">{template.category}</span>{isStarter && <span>Read-only starter preview</span>}</div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Steps ({steps?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-zinc-300">
              {(steps ?? []).map((s) => {
                const rules = (s.validation_rules ?? {}) as { options?: string[]; accepted_types?: string[]; max_size_bytes?: number };
                return <li key={s.id} className="border-b border-border py-3 last:border-0"><div className="flex items-center justify-between gap-3"><span className="font-medium text-foreground">{s.title}</span><span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">{RESPONSE_TYPE_LABELS[s.type] ?? s.type}</span></div>{s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}<p className="mt-1 text-xs text-muted-foreground">{s.is_required ? "Required" : "Optional"}{rules.options?.length ? ` · ${rules.options.length} options` : ""}{rules.accepted_types?.length ? ` · ${rules.accepted_types.join(", ")}` : ""}{rules.max_size_bytes ? ` · max ${Math.round(rules.max_size_bytes / 1024 / 1024)} MB` : ""}</p></li>;
              })}
            </ul>
          </CardContent>
        </Card>

        {!isStarter && (
          <Card>
            <CardHeader>
              <CardTitle>Edit template</CardTitle>
              <CardDescription>Customize the questions and requirements your clients will complete.</CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateBuilderForm
                initialTemplate={{
                  id: template.id,
                  title: template.title,
                  description: template.description,
                  steps: (steps ?? []).map((step) => ({
                    title: step.title,
                    description: step.description ?? "",
                    type: step.type,
                    is_required: step.is_required,
                    validation_rules: (step.validation_rules ?? {}) as { options?: string[]; accepted_types?: string[]; max_size_bytes?: number },
                  })),
                }}
              />
            </CardContent>
          </Card>
        )}

        {isStarter ? (
          <Card id="send-to-client">
            <CardHeader>
              <CardTitle>Use this template</CardTitle>
              <CardDescription>Use this ready-made workflow for a client, or duplicate it first if you want to customize it.</CardDescription>
            </CardHeader>
            <CardContent>
              <SendToClientForm templateId={template.id} />
              <div className="mt-4 border-t border-border pt-4">
                <DuplicateTemplateButton templateId={template.id} label="Duplicate for customization" />
              </div>
            </CardContent>
          </Card>
        ) : <Card id="send-to-client">
          <CardHeader>
            <CardTitle>Send to a client</CardTitle>
            <CardDescription>
              Generates a unique, no-login link for one specific client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SendToClientForm templateId={template.id} />
          </CardContent>
        </Card>}

        <Card>
          <CardHeader>
            <CardTitle>Sent links ({instances?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {!instances || instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client links sent yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {instances.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-zinc-300">
                      {i.client_name} · {i.client_email}
                    </span>
                    <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs capitalize text-muted-foreground">
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