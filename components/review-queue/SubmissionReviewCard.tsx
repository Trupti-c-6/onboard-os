"use client";

import { useState, useActionState } from "react";
import { CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  approveSubmission,
  rejectSubmission,
  getSignedAssetUrl,
  type RejectState,
} from "@/lib/actions/review-actions";

type Asset = { id: string; file_name: string };

export type ReviewSubmission = {
  id: string;
  stepTitle: string;
  stepType: string;
  status: string;
  value_text: string | null;
  value_json: Record<string, unknown> | null;
  assets: Asset[];
};

const initialRejectState: RejectState = { success: false, message: "" };

export function SubmissionReviewCard({
  submission,
  instanceId,
  instanceToken,
}: {
  submission: ReviewSubmission;
  instanceId: string;
  instanceToken: string;
}) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectState, rejectAction, isRejecting] = useActionState(
    rejectSubmission,
    initialRejectState
  );

  async function handleApprove() {
    setApproving(true);
    await approveSubmission(submission.id, instanceId, instanceToken);
    setApproving(false);
  }

  const decided = submission.status === "approved" || submission.status === "rejected";

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-foreground">{submission.stepTitle}</h3>
        {submission.status === "approved" && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Approved
          </span>
        )}
        {submission.status === "rejected" && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-400">
            <XCircle className="h-4 w-4" /> Rejected
          </span>
        )}
      </div>

      {submission.value_text && (
        <p className="rounded-lg border border-border-subtle bg-secondary p-3 text-sm text-zinc-300">
          {submission.value_text}
        </p>
      )}
      {submission.value_json && !submission.assets.length && (
        <p className="rounded-lg border border-border-subtle bg-secondary p-3 text-sm text-zinc-300">
          {JSON.stringify(submission.value_json)}
        </p>
      )}
      {submission.assets.map((asset) => (
        <FilePreviewLink key={asset.id} asset={asset} />
      ))}

      {!decided && (
        <div className="mt-3 flex items-center gap-2">
          <Button type="button" size="sm" onClick={handleApprove} disabled={approving}>
            {approving ? "Approving..." : "Approve"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowRejectBox((v) => !v)}
          >
            Reject
          </Button>
        </div>
      )}

      {showRejectBox && !decided && (
        <form action={rejectAction} className="mt-3 space-y-2">
          <input type="hidden" name="submissionId" value={submission.id} />
          <input type="hidden" name="instanceId" value={instanceId} />
          <input type="hidden" name="instanceToken" value={instanceToken} />
          <textarea
            name="reason"
            required
            placeholder="What needs to change? (sent to the client)"
            rows={2}
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <Button type="submit" size="sm" variant="destructive" disabled={isRejecting}>
            {isRejecting ? "Sending..." : "Send rejection"}
          </Button>
          {rejectState.message && (
            <p className={`text-sm ${rejectState.success ? "text-emerald-400" : "text-red-400"}`}>
              {rejectState.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function FilePreviewLink({ asset }: { asset: Asset }) {
  const [loading, setLoading] = useState(false);

  async function handleView() {
    setLoading(true);
    const result = await getSignedAssetUrl(asset.id);
    setLoading(false);
    if (result.success) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      alert(result.error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleView}
      disabled={loading}
      className="mt-2 flex items-center gap-2 text-sm text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {asset.file_name}
    </button>
  );
}