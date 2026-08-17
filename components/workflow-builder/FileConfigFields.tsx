import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_MAX_SIZE_MB = 10;

export function FileConfigFields({
  acceptedTypes,
  maxSizeBytes,
  onChange,
}: {
  acceptedTypes: string[] | undefined;
  maxSizeBytes: number | undefined;
  onChange: (patch: {
    accepted_types?: string[];
    max_size_bytes?: number;
  }) => void;
}) {
  const maxSizeMb = maxSizeBytes
    ? Math.round(maxSizeBytes / (1024 * 1024))
    : DEFAULT_MAX_SIZE_MB;

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        File requirements
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label
            htmlFor="accepted-types"
            className="text-xs font-normal text-slate-600"
          >
            Accepted file types
          </Label>

          <Input
            id="accepted-types"
            value={acceptedTypes?.join(", ") ?? ""}
            onChange={(e) =>
              onChange({
                accepted_types: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="pdf, png, jpg (leave blank for any)"
            className="bg-white text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label
            htmlFor="max-size"
            className="text-xs font-normal text-slate-600"
          >
            Max file size (MB)
          </Label>

          <Input
            id="max-size"
            type="number"
            min={1}
            value={maxSizeMb}
            onChange={(e) => {
              const mb = Number(e.target.value);

              onChange({
                max_size_bytes:
                  mb > 0 ? mb * 1024 * 1024 : undefined,
              });
            }}
            className="bg-white text-sm"
          />
        </div>
      </div>
    </div>
  );
}