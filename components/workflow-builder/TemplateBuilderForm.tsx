"use client";

import { useState, useActionState, useEffect, useRef, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { createTemplate, updateTemplate, type CreateTemplateState } from "@/lib/actions/template-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { StepCard, type BuilderStep } from "@/components/workflow-builder/StepCard";
import { TemplatePreview } from "@/components/workflow-builder/TemplatePreview";
import { cn } from "@/lib/utils";
import { CreateTemplateSchema, sanitizeStepForType } from "@/lib/actions/template-schemas";

const initialState: CreateTemplateState = { success: false, message: "" };

const emptyStep = (): BuilderStep => ({
  title: "",
  description: "",
  type: "short_text",
  is_required: true,
  validation_rules: {},
});

export function TemplateBuilderForm({ initialTemplate }: { initialTemplate?: { id: string; title: string; description: string | null; steps: BuilderStep[] } }) {
  const [title, setTitle] = useState(initialTemplate?.title ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [steps, setSteps] = useState<BuilderStep[]>(initialTemplate?.steps ?? [emptyStep()]);
  const [tab, setTab] = useState<"builder" | "preview">("builder");
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const firstInvalidRef = useRef<HTMLDivElement>(null);
  const [state, formAction, isPending] = useActionState(initialTemplate ? updateTemplate : createTemplate, initialState);

  function updateStep(index: number, patch: Partial<BuilderStep>) {
    setDirty(true);
    setSteps((prev) => prev.map((step, i) => (i === index ? sanitizeStepForType({ ...step, ...patch }) : step)));
  }

  function removeStep(index: number) {
    setDirty(true);
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function addStep() {
    setDirty(true);
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function moveStep(index: number, direction: "up" | "down") {
    setDirty(true);
    setSteps((prev) => {
      const next = [...prev];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    const result = CreateTemplateSchema.safeParse({ title, description, steps });
    if (result.success) {
      setValidationErrors({});
      return;
    }
    event.preventDefault();
    const errors: Record<number, string> = {};
    for (const issue of result.error.issues) {
      const stepIndex = typeof issue.path[0] === "number" ? issue.path[0] : undefined;
      if (stepIndex !== undefined && errors[stepIndex] === undefined) errors[stepIndex] = issue.message;
    }
    setValidationErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid !== undefined) requestAnimationFrame(() => firstInvalidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return (
    <form action={formAction} onSubmit={validateBeforeSubmit} className="space-y-6">
      <input type="hidden" name="title" value={title} />
      {initialTemplate && <input type="hidden" name="template_id" value={initialTemplate.id} />}
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="steps_json" value={JSON.stringify(steps)} />

      {/* Builder / Preview tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("builder")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            tab === "builder"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Builder
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            tab === "preview"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Preview
        </button>
      </div>

      {tab === "preview" ? (
        <TemplatePreview title={title} description={description} steps={steps} />
      ) : (
        <>
          {/* TEMPLATE DETAILS */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Template details
              </h2>
              <p className="text-sm text-muted-foreground">
                Give this reusable workflow a name your team will recognize.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="template-title">Template name</Label>
                  <Input
                    id="template-title"
                    placeholder="e.g. Website Design Client Onboarding"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="template-description">Internal description</Label>
                  <Input
                    id="template-description"
                    placeholder="What this template is used for (only your team sees this)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* WORKFLOW */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Workflow
              </h2>
              <p className="text-sm text-muted-foreground">
                Build the steps your client will complete, in order.
              </p>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} ref={validationErrors[index] ? firstInvalidRef : undefined}>
                <StepCard
                  step={step}
                  index={index}
                  total={steps.length}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  onMove={moveStep}
                  error={validationErrors[index]}
                />
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addStep} className="gap-2">
                <Plus className="h-4 w-4" />
                Add step
              </Button>
            </div>
          </section>
        </>
      )}

      {state.message && !state.success && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-6">
        <Button type="submit" disabled={isPending || (initialTemplate !== undefined && !dirty)}>
            {isPending ? "Saving..." : initialTemplate ? "Save changes" : "Save template"}
        </Button>
      </div>
    </form>
  );
}