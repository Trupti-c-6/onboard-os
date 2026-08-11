export function PortalHeader({
  title,
  progress,
  locked,
}: {
  title: string;
  progress: number;
  locked: boolean;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-6">
      <div className="mx-auto max-w-xl">
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        {locked ? (
          <p className="mt-1 text-sm text-green-600">Submitted — under review</p>
        ) : (
          <>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-slate-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{progress}% complete</p>
          </>
        )}
      </div>
    </div>
  );
}
