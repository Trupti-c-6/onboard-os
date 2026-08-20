import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileStack, SearchX, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TemplateToolbar } from "@/components/workflow-builder/TemplateToolbar";
import { TemplateCard, type TemplateCardData } from "@/components/workflow-builder/TemplateCard";

const SORT_COLUMN: Record<string, { column: "updated_at" | "created_at" | "title"; ascending: boolean }> = {
  updated_desc: { column: "updated_at", ascending: false },
  created_desc: { column: "created_at", ascending: false },
  name_asc: { column: "title", ascending: true },
  name_desc: { column: "title", ascending: false },
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const query = q ?? "";
  const sortKey = sort && SORT_COLUMN[sort] ? sort : "updated_desc";
  const { column, ascending } = SORT_COLUMN[sortKey];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let templatesQuery = supabase
    .from("workflow_templates")
    .select("id, title, description, is_active, updated_at, template_steps(count)")
    .order(column, { ascending });

  if (query.trim()) {
    templatesQuery = templatesQuery.ilike("title", `%${query.trim()}%`);
  }

  const { data: templates, error } = await templatesQuery;

  const cards: TemplateCardData[] = (templates ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    is_active: t.is_active,
    updatedAt: t.updated_at,
    stepCount: Array.isArray(t.template_steps) ? (t.template_steps[0]?.count ?? 0) : 0,
  }));

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reusable onboarding workflows for your client projects.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/templates/new" className="gap-2">
              <Plus className="h-4 w-4" /> Create template
            </Link>
          </Button>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <p className="font-medium text-foreground">Templates couldn&apos;t be loaded.</p>
              <p className="text-sm text-muted-foreground">Please try again.</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/templates">Try again</Link>
            </Button>
          </div>
        ) : !templates || templates.length === 0 ? (
          query.trim() ? (
            <>
              <TemplateToolbar query={query} sort={sortKey} />
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
                <SearchX className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">No templates found</p>
                  <p className="text-sm text-muted-foreground">Try a different template name.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/templates">Clear search</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-20 text-center">
              <FileStack className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">No templates yet</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Create your first onboarding workflow and reuse it for every client.
                </p>
              </div>
              <Button asChild className="mt-2 gap-2">
                <Link href="/dashboard/templates/new">
                  <Plus className="h-4 w-4" /> Create your first template
                </Link>
              </Button>
            </div>
          )
        ) : (
          <>
            <TemplateToolbar query={query} sort={sortKey} />
            <div className="mb-3 text-sm text-muted-foreground">
              {cards.length} {cards.length === 1 ? "template" : "templates"}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}