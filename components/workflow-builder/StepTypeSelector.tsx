import { FileText, AlignLeft, ListChecks, CheckSquare, Upload, KeyRound, PenTool } from "lucide-react";

export const STEP_TYPES = [
  { value: "short_text", label: "Short Text", icon: FileText },
  { value: "long_text", label: "Long Text", icon: AlignLeft },
  { value: "single_select", label: "Single Choice", icon: ListChecks },
  { value: "multi_select", label: "Multiple Choice", icon: CheckSquare },
  { value: "file_upload", label: "File Upload", icon: Upload },
  { value: "credential", label: "Credential", icon: KeyRound },
  { value: "e_sign", label: "Signature", icon: PenTool },
] as const;

export type StepTypeValue = (typeof STEP_TYPES)[number]["value"];

export function StepTypeSelector({
  value,
  onChange,
}: {
  value: StepTypeValue;
  onChange: (value: StepTypeValue) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as StepTypeValue)}
      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
    >
      {STEP_TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
