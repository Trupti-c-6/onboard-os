export function SelectInput({
  options,
  multi,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  multi: boolean;
  value: unknown;
  onChange: (v: string | string[]) => void;
  disabled?: boolean;
}) {
  if (!options || options.length === 0) {
    // Known gap: Milestone 2's template builder doesn't yet collect option
    // lists for select-type steps. Until that's added, this step type is
    // effectively a placeholder — flagged clearly rather than failing silently.
    return (
      <p className="text-sm text-amber-600">
        No options configured for this step yet.
      </p>
    );
  }

  if (multi) {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) =>
      onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);

    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              disabled={disabled}
              onChange={() => toggle(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name="select-input"
            checked={value === opt}
            disabled={disabled}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}
