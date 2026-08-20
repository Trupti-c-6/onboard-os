import { Upload } from "lucide-react";
import { ShortTextInput } from "@/components/client-portal/StepInputs/ShortTextInput";
import { LongTextInput } from "@/components/client-portal/StepInputs/LongTextInput";
import { SelectInput } from "@/components/client-portal/StepInputs/SelectInput";
import type { BuilderStep } from "./StepCard";

export function TemplatePreview({
  title,
  description,
  steps,
}: {
  title: string;
  description: string;
  steps: BuilderStep[];
}) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-secondary p-6">
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {title.trim() || "Untitled template"}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      <div className="space-y-4">
        {steps.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Add a step to see how it looks to your client.
          </p>
        )}

        {steps.map((step, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-medium text-foreground">
              {step.title.trim() || "Untitled step"}{" "}
              {step.is_required && <span className="text-red-400">*</span>}
            </h3>

            {step.description && (
              <p className="mb-3 text-sm text-muted-foreground">{step.description}</p>
            )}
            {!step.description && <div className="mb-3" />}

            {step.type === "short_text" && <ShortTextInput value="" onChange={() => {}} disabled />}
            {step.type === "long_text" && <LongTextInput value="" onChange={() => {}} disabled />}

            {(step.type === "single_select" || step.type === "multi_select") && (
              <SelectInput
                options={step.validation_rules?.options ?? []}
                multi={step.type === "multi_select"}
                value={undefined}
                onChange={() => {}}
                disabled
              />
            )}

            {step.type === "file_upload" && (
              <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border-subtle bg-input px-3 py-4 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />
                Choose file
                {step.validation_rules?.accepted_types?.length ? (
                  <span className="ml-auto text-xs">
                    {step.validation_rules.accepted_types.join(", ")}
                  </span>
                ) : null}
              </div>
            )}

            {(step.type === "credential" || step.type === "e_sign") && (
              <p className="text-sm text-amber-400">
                This step type isn&apos;t available to clients yet — coming soon.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}