import { GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StepTypeSelector, type StepTypeValue } from "./StepTypeSelector";

export type BuilderStep = {
  title: string;
  description: string;
  type: StepTypeValue;
  is_required: boolean;
};

export function StepCard({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  step: BuilderStep;
  index: number;
  total: number;
  onUpdate: (index: number, patch: Partial<BuilderStep>) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <GripVertical className="mt-2 h-5 w-5 shrink-0 text-slate-300" />

      <div className="flex-1 space-y-3">
        <div className="flex gap-3">
          <Input
            placeholder="Step title (e.g. Upload your logo)"
            value={step.title}
            onChange={(e) => onUpdate(index, { title: e.target.value })}
            className="flex-1"
          />
          <StepTypeSelector
            value={step.type}
            onChange={(type) => onUpdate(index, { type })}
          />
        </div>
        <Input
          placeholder="Optional description shown to the client"
          value={step.description}
          onChange={(e) => onUpdate(index, { description: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={step.is_required}
            onChange={(e) => onUpdate(index, { is_required: e.target.checked })}
          />
          Required step
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === 0}
          onClick={() => onMove(index, "up")}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === total - 1}
          onClick={() => onMove(index, "down")}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
