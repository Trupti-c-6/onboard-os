"use client";
import { useActionState } from "react";
import { Copy } from "lucide-react";
import { duplicateTemplate } from "@/lib/actions/template-actions";

const initialState = {
  success: false,
  message: "",
};

export function DuplicateTemplateButton({
  templateId,
}: {
  templateId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    async () => duplicateTemplate(templateId),
    initialState
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent disabled:opacity-50"
        >
          <Copy className="h-3.5 w-3.5" />
          {isPending ? "Duplicating..." : "Duplicate"}
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