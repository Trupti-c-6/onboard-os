export function LongTextInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={4}
      placeholder="Your answer"
      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:opacity-50"
    />
  );
}
