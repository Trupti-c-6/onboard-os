"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSignedUploadUrl, registerSubmissionAsset } from "@/lib/actions/upload-actions";

type OnSaved = (
  stepId: string,
  value: { value_json?: Record<string, unknown> },
  allComplete?: boolean
) => void;

export function FileUploadInput({
  token,
  stepId,
  validationRules,
  disabled,
  existingFileName,
  onSaved,
}: {
  token: string;
  stepId: string;
  validationRules: Record<string, unknown> | null;
  disabled?: boolean;
  existingFileName?: string | null;
  onSaved: OnSaved;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const maxSizeBytes = (validationRules?.max_size_bytes as number) ?? 10 * 1024 * 1024;
  const acceptedTypes = validationRules?.accepted_types as string[] | undefined;

  async function handleFile(file: File) {
    setError(null);

    if (file.size > maxSizeBytes) {
      setStatus("error");
      setError(`File is too large. Max size is ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`);
      return;
    }
    if (acceptedTypes && acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
      setStatus("error");
      setError("This file type isn't accepted for this step.");
      return;
    }

    setStatus("uploading");

    // Step 1: ask the server to verify our token and reserve an upload slot
    const signed = await getSignedUploadUrl({ token, stepId, fileName: file.name });
    if (!signed.success) {
      setStatus("error");
      setError(signed.error);
      return;
    }

    // Step 2: upload the actual bytes directly to Supabase Storage —
    // the signed token itself is the authorization, no RLS check needed here
    const browserClient = createClient();
    const { error: uploadError } = await browserClient.storage
      .from("onboarding-assets")
      .uploadToSignedUrl(signed.path, signed.uploadToken, file);

    if (uploadError) {
      setStatus("error");
      setError("Upload failed. Please try again.");
      return;
    }

    // Step 3: tell our DB the upload succeeded and link it to this submission
    const registered = await registerSubmissionAsset({
      token,
      stepId,
      fileName: file.name,
      storagePath: signed.path,
      fileSizeBytes: file.size,
      mimeType: file.type,
    });

    if (!registered.success) {
      setStatus("error");
      setError(registered.error ?? "Could not save file record.");
      return;
    }

    setStatus("idle");
    onSaved(stepId, { value_json: { file_name: file.name } }, registered.allStepsComplete);
  }

  const uploadedName = existingFileName;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled || status === "uploading"}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={disabled || status === "uploading"}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-200 py-6 text-sm text-slate-500 disabled:opacity-50"
      >
        {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "idle" && uploadedName && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {status === "idle" && !uploadedName && <Upload className="h-4 w-4" />}
        {status === "uploading"
          ? "Uploading..."
          : uploadedName
          ? uploadedName
          : "Click to upload a file"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
