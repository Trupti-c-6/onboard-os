"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth-actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
