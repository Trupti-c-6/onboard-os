"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { duplicateTemplate } from "@/lib/actions/template-actions";

const initialState = {
  success: false,
  message: "",
};

export function DuplicateTemplateButton({
  templateId,
  label,
}: {
  templateId: string;
  label?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async () => duplicateTemplate(templateId),
    initialState
  );

  useEffect(() => {
    if (state.success && "templateId" in state && state.templateId) {
      router.push(`/dashboard/templates/${state.templateId}`);
    }
  }, [router, state]);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
          {isPending ? "Working..." : label ?? "Duplicate"}
        </button>
      </form>

      {state.message && (
        <p
          className={`px-3 pb-1 text-xs ${
            state.success ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}