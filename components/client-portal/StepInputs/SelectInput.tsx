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
    return (
      <p className="text-sm text-amber-400">
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
          <label key={opt} className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              disabled={disabled}
              onChange={() => toggle(opt)}
              className="h-4 w-4 rounded border-input-border bg-input accent-[#7c3aed]"
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
        <label key={opt} className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="radio"
            name="select-input"
            checked={value === opt}
            disabled={disabled}
            onChange={() => onChange(opt)}
            className="h-4 w-4 border-input-border bg-input accent-[#7c3aed]"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}