"use client";

import { useState } from "react";
import { PortalHeader } from "./PortalHeader";
import { StepList } from "./StepList";
import type { PortalData } from "@/lib/portal/get-portal-data";

type ValidPortalData = Extract<PortalData, { valid: true }>;

export function PortalClient({ token, data }: { token: string; data: ValidPortalData }) {
  const [submissions, setSubmissions] = useState(data.submissions);
  const [locked, setLocked] = useState(
    data.instance.status === "submitted" ||
      data.instance.status === "in_review" ||
      data.instance.status === "completed"
  );

  const requiredSteps = data.steps.filter((s) => s.is_required);
  const completedCount = requiredSteps.filter(
    (s) => submissions[s.id]?.status === "submitted"
  ).length;
  const progress =
    requiredSteps.length === 0 ? 0 : Math.round((completedCount / requiredSteps.length) * 100);

  function handleSaved(
    stepId: string,
    value: { value_text?: string; value_json?: Record<string, unknown> },
    allComplete?: boolean
  ) {
    setSubmissions((prev) => ({
      ...prev,
      [stepId]: {
        status: "submitted",
        value_text: value.value_text ?? null,
        value_json: value.value_json ?? null,
      },
    }));
    if (allComplete) setLocked(true);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <PortalHeader
        title={data.template.title}
        progress={progress}
        locked={locked}
        org={data.org}
      />
      <div className="mx-auto max-w-xl px-4 pt-6">
        <StepList
          token={token}
          steps={data.steps}
          submissions={submissions}
          locked={locked}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}
