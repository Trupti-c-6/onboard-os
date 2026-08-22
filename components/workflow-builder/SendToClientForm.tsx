"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Copy, Check } from "lucide-react";
import { createClientInstance, retryClientInvitationEmail, type CreateInstanceState } from "@/lib/actions/client-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: CreateInstanceState = { success: false, message: "" };

export function SendToClientForm({ templateId }: { templateId: string }) {
  const [state, formAction, isPending] = useActionState(createClientInstance, initialState);
  const [retryState, setRetryState] = useState<CreateInstanceState | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const result = retryState ?? state;

  async function retryEmail() {
    if (!state.instanceId) return;
    setRetrying(true);
    setRetryState(await retryClientInvitationEmail(state.instanceId));
    setRetrying(false);
  }

  async function copyPortalUrl() {
    if (!result.portalUrl) return;
    await navigator.clipboard.writeText(result.portalUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="templateId" value={templateId} />
      <Input name="clientName" placeholder="Client name" required />
      <Input name="clientEmail" type="email" placeholder="Client email" required />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Generating..." : "Generate Link"}
      </Button>

      {result.message && result.success && result.emailSent && (
          <p className="text-sm text-emerald-400">{result.message}</p>
      )}
      {result.message && result.success && !result.emailSent && (
          <div className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
            <p className="min-w-0 flex-1">{result.message}</p>
            {result.instanceId && <Button type="button" variant="outline" size="sm" className="ml-auto shrink-0 border-amber-400/30 text-amber-200 hover:bg-amber-400/10" onClick={retryEmail} disabled={retrying}>{retrying ? "Retrying..." : "Retry email"}</Button>}
          </div>
      )}
      {result.message && !result.success && (
          <p className="text-sm text-red-400">{result.message}</p>
      )}
      {result.success && result.portalUrl && (
        <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
          <p className="mb-1 text-muted-foreground">Share this link with your client:</p>
          <div className="flex flex-col items-stretch gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all text-foreground">{result.portalUrl}</code>
            <Button type="button" variant="outline" size="sm" className="shrink-0 sm:min-w-24" onClick={copyPortalUrl}>
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p className="pt-3 text-xs text-muted-foreground">You can share this link manually with your client.</p>
        </div>
      )}
    </form>
  );
}