import { PortalStepCard } from "./PortalStepCard";
import type { PortalStep, PortalSubmission } from "@/lib/portal/types";

type OnSaved = (
  stepId: string,
  value: { value_text?: string; value_json?: Record<string, unknown> },
  allComplete?: boolean
) => void;

export function StepList({
  token,
  steps,
  submissions,
  locked,
  onSaved,
}: {
  token: string;
  steps: PortalStep[];
  submissions: Record<string, PortalSubmission>;
  locked: boolean;
  onSaved: OnSaved;
}) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <PortalStepCard
          key={step.id}
          token={token}
          step={step}
          submission={submissions[step.id]}
          locked={locked}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}
