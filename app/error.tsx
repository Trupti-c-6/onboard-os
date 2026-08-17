"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// App Router error boundary: catches unhandled errors thrown anywhere in a
// route segment's rendering. Client component by convention (Next.js
// requires this file to be a client component so it can offer a retry
// action via `reset`).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // In production this is where you'd forward to an error-reporting
    // service (Sentry, etc.). No such service is wired up in this repo —
    // logging to console is the honest current state, not a placeholder
    // for something that silently does nothing.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-slate-500">
          An unexpected error occurred. You can try again, or head back to the dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
