import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StepTypeSelector, type StepTypeValue } from "./StepTypeSelector";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import { FileConfigFields } from "./FileConfigFields";
import { sanitizeStepForType } from "@/lib/actions/template-schemas";

export type StepValidationRules = {
  options?: string[];
  accepted_types?: string[];
  max_size_bytes?: number;
};

export type BuilderStep = {
  title: string;
  description: string;
  type: StepTypeValue;
  is_required: boolean;
  validation_rules?: StepValidationRules;
};

const CHOICE_TYPES: StepTypeValue[] = ["single_select", "multi_select"];

export function StepCard({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  error,
}: {
  step: BuilderStep;
  index: number;
  total: number;
  onUpdate: (index: number, patch: Partial<BuilderStep>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  error?: string;
}) {
  const isChoiceType = CHOICE_TYPES.includes(step.type);
  const isFileType = step.type === "file_upload";

  function updateValidationRules(patch: Partial<StepValidationRules>) {
    onUpdate(index, { validation_rules: { ...step.validation_rules, ...patch } });
  }

  return (
    <div className={`rounded-xl border bg-card p-5 ${error ? "border-red-500/60" : "border-border"}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {step.title.trim() || "Untitled step"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(index, "up")}
            aria-label="Move step up"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === total - 1}
            onClick={() => onMove(index, "down")}
            aria-label="Move step down"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label="Delete step"
          >
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr,200px]">
          <div className="space-y-1.5">
            <Label htmlFor={`step-title-${index}`}>Step title</Label>
            <Input
              id={`step-title-${index}`}
              placeholder="e.g. What is your company name?"
              value={step.title}
              onChange={(e) => onUpdate(index, { title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`step-type-${index}`}>Response type</Label>
            <StepTypeSelector
              id={`step-type-${index}`}
              value={step.type}
              onChange={(type) => onUpdate(index, sanitizeStepForType({ ...step, type }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`step-desc-${index}`}>Client-facing description</Label>
          <Input
            id={`step-desc-${index}`}
            placeholder="Shown to the client above their answer (optional)"
            value={step.description}
            onChange={(e) => onUpdate(index, { description: e.target.value })}
          />
        </div>

        {isChoiceType && (
          <ChoiceOptionsEditor
            options={step.validation_rules?.options ?? []}
            onChange={(options) => updateValidationRules({ options })}
          />
        )}

        {isFileType && (
          <FileConfigFields
            acceptedTypes={step.validation_rules?.accepted_types}
            maxSizeBytes={step.validation_rules?.max_size_bytes}
            onChange={updateValidationRules}
          />
        )}

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={step.is_required}
            onChange={(e) => onUpdate(index, { is_required: e.target.checked })}
            className="h-4 w-4 rounded border-input-border bg-input accent-[#7c3aed]"
          />
          Required step
        </label>
      </div>
    </div>
  );
}