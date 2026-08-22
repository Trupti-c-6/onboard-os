"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTemplate } from "@/lib/actions/template-actions";

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async () => deleteTemplate(templateId),
    { success: false, message: "" }
  );

  useEffect(() => {
    if (state.success) router.push("/dashboard/templates");
  }, [router, state.success]);

  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-accent disabled:opacity-50">
        <Trash2 className="h-3.5 w-3.5" /> {pending ? "Deleting..." : "Delete"}
      </button>
      {state.message && !state.success && <p className="px-3 pb-1 text-xs text-red-400">{state.message}</p>}
    </form>
  );
}