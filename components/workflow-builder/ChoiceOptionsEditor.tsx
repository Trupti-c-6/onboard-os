import { GripVertical, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChoiceOptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  function updateOption(index: number, value: string) {
    onChange(options.map((o, i) => (i === index ? value : o)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function addOption() {
    onChange([...options, ""]);
  }

  function moveOption(index: number, direction: "up" | "down") {
    const swapWith = direction === "up" ? index - 1 : index + 1;

    if (swapWith < 0 || swapWith >= options.length) return;

    const next = [...options];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];

    onChange(next);
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Options
      </p>

      <div className="space-y-2">
        {options.length === 0 && (
          <p className="text-sm text-slate-400">
            No options yet — add at least 2.
          </p>
        )}

        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />

            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="flex-1 bg-white"
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => moveOption(index, "up")}
              aria-label="Move option up"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={index === options.length - 1}
              onClick={() => moveOption(index, "down")}
              aria-label="Move option down"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeOption(index)}
              aria-label="Remove option"
            >
              <X className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addOption}
        className="mt-2 gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add option
      </Button>

      {options.length > 0 && options.length < 2 && (
        <p className="mt-2 text-xs text-amber-600">
          Add at least one more option before saving.
        </p>
      )}
    </div>
  );
}