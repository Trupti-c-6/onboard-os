"use client";

import { useActionState } from "react";
import { createClientInstance, type CreateInstanceState } from "@/lib/actions/client-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: CreateInstanceState = { success: false, message: "" };

export function SendToClientForm({ templateId }: { templateId: string }) {
  const [state, formAction, isPending] = useActionState(createClientInstance, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="templateId" value={templateId} />
      <Input name="clientName" placeholder="Client name" required />
      <Input name="clientEmail" type="email" placeholder="Client email" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Generating..." : "Generate Link"}
      </Button>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
      {state.success && state.portalUrl && (
        <div className="rounded-md bg-slate-50 p-3 text-sm">
          <p className="mb-1 text-slate-500">Share this link with your client:</p>
          <code className="break-all text-slate-900">{state.portalUrl}</code>
        </div>
      )}
    </form>
  );
}
