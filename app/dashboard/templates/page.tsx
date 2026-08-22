import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileStack, SearchX, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TemplateToolbar } from "@/components/workflow-builder/TemplateToolbar";
import { TemplateCard, type TemplateCardData } from "@/components/workflow-builder/TemplateCard";
import { isStarterTemplate } from "@/lib/templates/classification";
import { canonicalCategories } from "@/lib/templates/categories";

const SORT_COLUMN: Record<string, { column: "updated_at" | "created_at" | "title"; ascending: boolean }> = {
  updated_desc: { column: "updated_at", ascending: false },
  created_desc: { column: "created_at", ascending: false },
  name_asc: { column: "title", ascending: true },
  name_desc: { column: "title", ascending: false },
};

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
}) {
  const { q, sort, category } = await searchParams;
  const query = q ?? "";
  const sortKey = sort && SORT_COLUMN[sort] ? sort : "updated_desc";
  const { column, ascending } = SORT_COLUMN[sortKey];

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

  let starterQuery = supabase
    .from("workflow_templates")
    .select("id, organization_id, title, description, category, subcategory, purpose, target_provider, estimated_minutes, technical, document_heavy, approval_required, access_required, tags, is_starter, is_active, updated_at, template_steps(count), workflow_template_stages(count)")
    .is("organization_id", null)
    .eq("is_starter", true)
    .order(column, { ascending });
  let customQuery = supabase
    .from("workflow_templates")
    .select("id, organization_id, title, description, category, subcategory, purpose, target_provider, estimated_minutes, technical, document_heavy, approval_required, access_required, tags, is_starter, is_active, updated_at, template_steps(count), workflow_template_stages(count)")
    .eq("organization_id", profile.organization_id)
    .eq("is_starter", false)
    .order(column, { ascending });

  const categoriesQuery = supabase
    .from("workflow_templates")
    .select("category")
    .or(`and(organization_id.is.null,is_starter.eq.true),and(organization_id.eq.${profile.organization_id},is_starter.eq.false)`);

  if (query.trim()) {
    const search = `title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,purpose.ilike.%${query.trim()}%,category.ilike.%${query.trim()}%,subcategory.ilike.%${query.trim()}%,target_provider.ilike.%${query.trim()}%`;
    starterQuery = starterQuery.or(search);
    customQuery = customQuery.or(search);
  }
  if (category?.trim()) {
    starterQuery = starterQuery.eq("category", category.trim());
    customQuery = customQuery.eq("category", category.trim());
  }

  const [{ data: starterTemplates, error: starterError }, { data: customTemplates, error: customError }, { data: categoryRows }] = await Promise.all([starterQuery, customQuery, categoriesQuery]);
  const templates = [...(starterTemplates ?? []), ...(customTemplates ?? [])];
  const error = starterError ?? customError;
  const categories = canonicalCategories(categoryRows ?? []);

  const cards: TemplateCardData[] = (templates ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    targetProvider: t.target_provider,
    estimatedMinutes: t.estimated_minutes,
    stageCount: Array.isArray(t.workflow_template_stages) ? (t.workflow_template_stages[0]?.count ?? 0) : 0,
    technical: t.technical,
    documentHeavy: t.document_heavy,
    approvalRequired: t.approval_required,
    accessRequired: t.access_required,
    tags: Array.isArray(t.tags) ? t.tags : [],
    isStarter: isStarterTemplate({ organization_id: t.organization_id, is_starter: t.is_starter }),
    is_active: t.is_active,
    updatedAt: t.updated_at,
    stepCount: Array.isArray(t.template_steps) ? (t.template_steps[0]?.count ?? 0) : 0,
  }));

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Template Library</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a ready-made workflow and start onboarding clients in minutes.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/templates/new" className="gap-2">
              <Plus className="h-4 w-4" /> Create custom template
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
          query.trim() || category?.trim() ? (
            <>
              <TemplateToolbar query={query} sort={sortKey} category={category ?? ""} categories={categories} />
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
            <TemplateToolbar query={query} sort={sortKey} category={category ?? ""} categories={categories} />
            <section className="mb-8">
              <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Starter templates</h2><span className="text-xs text-muted-foreground">Ready to customize</span></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.filter((template) => template.isStarter).map((template) => <TemplateCard key={template.id} template={template} />)}</div>
            </section>
            <section>
              <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your templates</h2><span className="text-xs text-muted-foreground">{cards.filter((template) => !template.isStarter).length} saved</span></div>
              {cards.some((template) => !template.isStarter) ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.filter((template) => !template.isStarter).map((template) => <TemplateCard key={template.id} template={template} />)}</div> : <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">Your customized templates will appear here.</p>}
            </section>
          </>
        )}
      </div>
    </div>
  );
}