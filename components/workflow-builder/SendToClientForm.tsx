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
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
          {state.message}
        </p>
      )}
      {state.success && state.portalUrl && (
        <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
          <p className="mb-1 text-muted-foreground">Share this link with your client:</p>
          <code className="break-all text-foreground">{state.portalUrl}</code>
        </div>
      )}
    </form>
  );
}