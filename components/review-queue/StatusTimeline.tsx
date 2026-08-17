import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type StatusEvent = {
  id: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  active: "Link generated",
  in_progress: "Client started",
  submitted: "Submitted for review",
  in_review: "Under review",
  completed: "Completed",
  stalled: "Stalled (no response)",
  archived: "Archived",
};

function label(status: string) {
  return LABELS[status] ?? status;
}

// Populated automatically by a DB trigger (see
// 20260813000000_org_branding_and_history.sql) on every client_instances
// status change — this component never writes anything, it only reads.
export function StatusTimeline({ events }: { events: StatusEvent[] }) {
  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline</CardTitle>
      </CardHeader>
      <ol className="space-y-3 px-6 pb-6">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-3 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <div>
              <p className="text-slate-700">
                {event.from_status ? (
                  <>
                    {label(event.from_status)} <span className="text-slate-400">→</span>{" "}
                    {label(event.to_status)}
                  </>
                ) : (
                  label(event.to_status)
                )}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(event.created_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
