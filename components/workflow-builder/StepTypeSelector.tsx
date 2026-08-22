import {
  FileText,
  AlignLeft,
  ListChecks,
  CheckSquare,
  Upload,
  KeyRound,
  PenTool,
} from "lucide-react";

export const STEP_TYPES = [
  { value: "short_text", label: "Short text", icon: FileText, comingSoon: false },
  { value: "long_text", label: "Long text", icon: AlignLeft, comingSoon: false },
  { value: "single_select", label: "Single choice", icon: ListChecks, comingSoon: false },
  { value: "multi_select", label: "Multiple choice", icon: CheckSquare, comingSoon: false },
  { value: "file_upload", label: "File upload", icon: Upload, comingSoon: false },
  { value: "credential", label: "Credential (Coming soon)", icon: KeyRound, comingSoon: true },
  { value: "e_sign", label: "E-signature (Coming soon)", icon: PenTool, comingSoon: true },
] as const;

export type StepTypeValue = (typeof STEP_TYPES)[number]["value"];

export function StepTypeSelector({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: StepTypeValue;
  onChange: (value: StepTypeValue) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as StepTypeValue)}
      className="h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      {STEP_TYPES.map((t) => (
        <option key={t.value} value={t.value} disabled={t.comingSoon}>
          {t.label}
        </option>
      ))}
    </select>
  );
}