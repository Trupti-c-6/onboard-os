export function PortalHeader({
  title,
  progress,
  locked,
  org,
}: {
  title: string;
  progress: number;
  locked: boolean;
  org: { name: string; logoUrl: string | null; brandColor: string };
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto max-w-xl">
        <div className="mb-3 flex items-center gap-2">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external, org-provided URL; next/image domain allowlisting isn't configured for arbitrary client logos
            <img
              src={org.logoUrl}
              alt={org.name}
              className="h-6 max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-sm font-semibold" style={{ color: org.brandColor }}>
              {org.name}
            </span>
          )}
        </div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {locked ? (
          <p className="mt-1 text-sm text-green-600">Submitted — under review</p>
        ) : (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: org.brandColor }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{progress}% complete</p>
          </>
        )}
      </div>
    </div>
  );
}
