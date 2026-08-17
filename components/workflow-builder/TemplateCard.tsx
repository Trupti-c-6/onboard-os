import Link from "next/link";
import { MoreHorizontal, Archive, ArchiveRestore, ListChecks, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { archiveTemplate } from "@/lib/actions/template-actions";
import { DuplicateTemplateButton } from "./DuplicateTemplateButton";

export type TemplateCardData = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  stepCount: number;
  updatedAt: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TemplateCard({ template }: { template: TemplateCardData }) {
  const detailHref = `/dashboard/templates/${template.id}`;

  return (
    <Card
      className={`flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
        template.is_active ? "" : "bg-slate-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={detailHref} className="block">
            <h3
              className={`truncate text-base font-semibold leading-tight ${
                template.is_active ? "text-slate-900" : "text-slate-500"
              } hover:underline`}
              title={template.title}
            >
              {template.title}
            </h3>
          </Link>

          <span
            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              template.is_active
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                template.is_active ? "bg-green-500" : "bg-slate-400"
              }`}
              aria-hidden
            />
            {template.is_active ? "Active" : "Archived"}
          </span>
        </div>

        {/* Zero-dependency dropdown: native <details>/<summary>. No Radix
            dropdown-menu package is installed in this project, and adding
            one just for a 3-item menu would be an unnecessary dependency. */}
        <details className="relative shrink-0">
          <summary
            className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 [&::-webkit-details-marker]:hidden"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <DuplicateTemplateButton templateId={template.id} />
            <form action={archiveTemplate.bind(null, template.id, template.is_active)}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {template.is_active ? (
                  <>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
                  </>
                )}
              </button>
            </form>
          </div>
        </details>
      </div>

      <p className="mt-2 line-clamp-2 flex-1 text-sm text-slate-500">
        {template.description || "No description"}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5 text-slate-400" />
          {template.stepCount} {template.stepCount === 1 ? "step" : "steps"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          Updated {timeAgo(template.updatedAt)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <Button asChild className="w-full">
          <Link href={`${detailHref}#send-to-client`}>Use template</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="w-full">
          <Link href={detailHref}>Edit</Link>
        </Button>
      </div>
    </Card>
  );
}