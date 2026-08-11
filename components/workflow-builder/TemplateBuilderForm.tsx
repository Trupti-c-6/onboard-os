"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createTemplate, type CreateTemplateState } from "@/lib/actions/template-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StepCard, type BuilderStep } from "@/components/workflow-builder/StepCard";

const initialState: CreateTemplateState = { success: false, message: "" };

const emptyStep = (): BuilderStep => ({
  title: "",
  description: "",
  type: "short_text",
  is_required: true,
});

export function TemplateBuilderForm() {
  const [steps, setSteps] = useState<BuilderStep[]>([emptyStep()]);
  const [state, formAction, isPending] = useActionState(createTemplate, initialState);

  function updateStep(index: number, patch: Partial<BuilderStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function moveStep(index: number, direction: "up" | "down") {
    setSteps((prev) => {
      const next = [...prev];
      const swapWith = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Steps are built up as local state, then serialized to JSON on
          submit — the Server Action parses this back out with Zod. */}
      <input type="hidden" name="steps_json" value={JSON.stringify(steps)} />

      <Card>
        <CardHeader>
          <CardTitle>Template details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input name="title" placeholder="Template title (e.g. Web Design Onboarding)" required />
          <Input name="description" placeholder="Optional description (internal use only)" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Steps</h3>
        {steps.map((step, index) => (
          <StepCard
            key={index}
            step={step}
            index={index}
            total={steps.length}
            onUpdate={updateStep}
            onRemove={removeStep}
            onMove={moveStep}
          />
        ))}
        <Button type="button" variant="outline" onClick={addStep} className="gap-2">
          <Plus className="h-4 w-4" /> Add step
        </Button>
      </div>

      {state.message && !state.success && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">{state.message}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Template"}
      </Button>
    </form>
  );
}
