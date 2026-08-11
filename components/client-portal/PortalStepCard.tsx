"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitClientStep } from "@/lib/actions/portal-actions";
import { ShortTextInput } from "./StepInputs/ShortTextInput";
import { LongTextInput } from "./StepInputs/LongTextInput";
import { SelectInput } from "./StepInputs/SelectInput";
import { FileUploadInput } from "./StepInputs/FileUploadInput";
import type { PortalStep, PortalSubmission } from "@/lib/portal/types";

type OnSaved = (
  stepId: string,
  value: { value_text?: string; value_json?: Record<string, unknown> },
  allComplete?: boolean
) => void;

const NO_SAVE_BUTTON_TYPES = ["file_upload", "credential", "e_sign"];

export function PortalStepCard({
  token,
  step,
  submission,
  locked,
  onSaved,
}: {
  token: string;
  step: PortalStep;
  submission?: PortalSubmission;
  locked: boolean;
  onSaved: OnSaved;
}) {
  const [text, setText] = useState(submission?.value_text ?? "");
  const [json, setJson] = useState<unknown>(submission?.value_json ?? undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSaved = submission?.status === "submitted";
  const disabled = locked || isSaved;

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await submitClientStep({
      token,
      step_id: step.id,
      value_text: text,
      value_json: json as Record<string, unknown> | undefined,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    onSaved(step.id, { value_text: text, value_json: json as Record<string, unknown> }, result.allStepsComplete);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-slate-900">
            {step.title} {step.is_required && <span className="text-red-500">*</span>}
          </h3>
          {step.description && <p className="text-sm text-slate-500">{step.description}</p>}
        </div>
        {isSaved && <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />}
      </div>

      {step.type === "short_text" && (
        <ShortTextInput value={text} onChange={setText} disabled={disabled} />
      )}
      {step.type === "long_text" && (
        <LongTextInput value={text} onChange={setText} disabled={disabled} />
      )}
      {(step.type === "single_select" || step.type === "multi_select") && (
        <SelectInput
          options={(step.validation_rules?.options as string[]) ?? []}
          multi={step.type === "multi_select"}
          value={json}
          onChange={setJson}
          disabled={disabled}
        />
      )}
      {step.type === "file_upload" && (
        <FileUploadInput
          token={token}
          stepId={step.id}
          validationRules={step.validation_rules}
          disabled={disabled}
          existingFileName={
            (submission?.value_json?.file_name as string | undefined) ?? undefined
          }
          onSaved={onSaved}
        />
      )}
      {(step.type === "credential" || step.type === "e_sign") && (
        <p className="text-sm text-slate-400">
          This step type isn&apos;t built yet — coming in a later milestone.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!disabled && !NO_SAVE_BUTTON_TYPES.includes(step.type) && (
        <Button type="button" size="sm" className="mt-3" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      )}
    </div>
  );
}
