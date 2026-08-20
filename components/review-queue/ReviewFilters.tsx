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
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        className="h-10 rounded-lg border border-input-border bg-input px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
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