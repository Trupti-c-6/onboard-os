import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending (submitted + in review)",
  submitted: "Submitted",
  in_review: "In review",
  completed: "Completed",
  stalled: "Stalled",
};

// Plain GET form, no client-side JS required: submitting re-navigates to
// /dashboard/reviews?q=...&status=..., which the server page reads via
// searchParams. Kept this way deliberately — it works even if JS is slow to
// hydrate, and there's no state here that needs to survive without a
// server round-trip anyway.
export function ReviewFilters({
  statusOptions,
  activeStatus,
  query,
}: {
  statusOptions: readonly string[];
  activeStatus: string;
  query: string;
}) {
  return (
    <form action="/dashboard/reviews" method="GET" className="mb-4 flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by client name or email"
          className="pl-9"
        />
      </div>

      <select
        name="status"
        defaultValue={activeStatus}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <option value="pending">{STATUS_LABELS.pending}</option>
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status] ?? status}
          </option>
        ))}
      </select>

      <Button type="submit" variant="outline">
        Apply
      </Button>
    </form>
  );
}
