"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";

import {
  createTemplate,
  type CreateTemplateState,
} from "@/lib/actions/template-actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

import {
  StepCard,
  type BuilderStep,
} from "@/components/workflow-builder/StepCard";

import { TemplatePreview } from "@/components/workflow-builder/TemplatePreview";

import { cn } from "@/lib/utils";

const initialState: CreateTemplateState = {
  success: false,
  message: "",
};

const emptyStep = (): BuilderStep => ({
  title: "",
  description: "",
  type: "short_text",
  is_required: true,
  validation_rules: {},
});

export function TemplateBuilderForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [steps, setSteps] = useState<BuilderStep[]>([
    emptyStep(),
  ]);

  const [tab, setTab] = useState<"builder" | "preview">(
    "builder"
  );

  const [state, formAction, isPending] = useActionState(
    createTemplate,
    initialState
  );

  function updateStep(
    index: number,
    patch: Partial<BuilderStep>
  ) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? {
              ...step,
              ...patch,
            }
          : step
      )
    );
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function addStep() {
    setSteps((prev) => [
      ...prev,
      emptyStep(),
    ]);
  }

  function moveStep(
    index: number,
    direction: "up" | "down"
  ) {
    setSteps((prev) => {
      const next = [...prev];

      const swapWith =
        direction === "up"
          ? index - 1
          : index + 1;

      if (
        swapWith < 0 ||
        swapWith >= next.length
      ) {
        return prev;
      }

      [next[index], next[swapWith]] = [
        next[swapWith],
        next[index],
      ];

      return next;
    });
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="title"
        value={title}
      />

      <input
        type="hidden"
        name="description"
        value={description}
      />

      <input
        type="hidden"
        name="steps_json"
        value={JSON.stringify(steps)}
      />

      {/* Builder / Preview tabs */}

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() =>
            setTab("builder")
          }
          className={cn(
            "px-4 py-2 text-sm font-medium",
            tab === "builder"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Builder
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("preview")
          }
          className={cn(
            "px-4 py-2 text-sm font-medium",
            tab === "preview"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Preview
        </button>
      </div>

      {tab === "preview" ? (
        <TemplatePreview
          title={title}
          description={description}
          steps={steps}
        />
      ) : (
        <>
          {/* TEMPLATE DETAILS */}

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Template details
              </h2>

              <p className="text-sm text-slate-400">
                Give this reusable workflow a name your
                team will recognize.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-1.5">
                  <Label htmlFor="template-title">
                    Template name
                  </Label>

                  <Input
                    id="template-title"
                    placeholder="e.g. Website Design Client Onboarding"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value)
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="template-description">
                    Internal description
                  </Label>

                  <Input
                    id="template-description"
                    placeholder="What this template is used for (only your team sees this)"
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* WORKFLOW */}

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Workflow
              </h2>

              <p className="text-sm text-slate-400">
                Build the steps your client will
                complete, in order.
              </p>
            </div>

            <div className="space-y-3">
              {steps.map(
                (step, index) => (
                  <StepCard
                    key={index}
                    step={step}
                    index={index}
                    total={steps.length}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                    onMove={moveStep}
                  />
                )
              )}

              <Button
                type="button"
                variant="outline"
                onClick={addStep}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add step
              </Button>
            </div>
          </section>
        </>
      )}

      {/* Error message */}

      {state.message &&
        !state.success && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {state.message}
          </p>
        )}

      {/* Save */}

      <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Saving..."
            : "Save template"}
        </Button>
      </div>
    </form>
  );
}