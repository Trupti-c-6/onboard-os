"use client";

import { useState } from "react";
import { PortalHeader } from "./PortalHeader";
import { StepList } from "./StepList";
import type { PortalData } from "@/lib/portal/get-portal-data";

type ValidPortalData = Extract<PortalData, { valid: true }>;

export function PortalClient({ token, data }: { token: string; data: ValidPortalData }) {
  const [submissions, setSubmissions] = useState(data.submissions);
  const [locked, setLocked] = useState(
    data.instance.status === "submitted" ||
      data.instance.status === "in_review" ||
      data.instance.status === "completed"
  );

  const requiredSteps = data.steps.filter((s) => s.is_required);
  const completedCount = requiredSteps.filter(
    (s) => submissions[s.id]?.status === "submitted"
  ).length;
  const progress =
    requiredSteps.length === 0 ? 0 : Math.round((completedCount / requiredSteps.length) * 100);

  function handleSaved(
    stepId: string,
    value: { value_text?: string; value_json?: Record<string, unknown> },
    allComplete?: boolean
  ) {
    setSubmissions((prev) => ({
      ...prev,
      [stepId]: {
        status: "submitted",
        value_text: value.value_text ?? null,
        value_json: value.value_json ?? null,
      },
    }));
    if (allComplete) setLocked(true);
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <PortalHeader
        title={data.template.title}
        progress={progress}
        locked={locked}
        org={data.org}
      />
      <div className="mx-auto max-w-xl px-4 pt-6">
        <StepList
          token={token}
          steps={data.steps}
          submissions={submissions}
          locked={locked}
          onSaved={handleSaved}
        />
        {(data.org.description || data.org.websiteUrl || data.org.supportEmail || data.org.phone || data.org.whatsapp || data.org.contactPerson || data.org.linkedinUrl || data.org.instagramUrl || data.org.facebookUrl || data.org.xUrl || data.org.businessAddress || data.org.businessHours || data.org.timeZone) && <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground"><h2 className="font-medium text-foreground">Need help?</h2>{data.org.contactPerson && <p className="mt-2 text-foreground">{data.org.contactPerson}</p>}{data.org.description && <p className="mt-2">{data.org.description}</p>}<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{data.org.websiteUrl && <a href={data.org.websiteUrl} className="underline" target="_blank" rel="noreferrer">Website</a>}{data.org.linkedinUrl && <a href={data.org.linkedinUrl} className="underline" target="_blank" rel="noreferrer">LinkedIn</a>}{data.org.instagramUrl && <a href={data.org.instagramUrl} className="underline" target="_blank" rel="noreferrer">Instagram</a>}{data.org.facebookUrl && <a href={data.org.facebookUrl} className="underline" target="_blank" rel="noreferrer">Facebook</a>}{data.org.xUrl && <a href={data.org.xUrl} className="underline" target="_blank" rel="noreferrer">X</a>}{data.org.supportEmail && <a href={`mailto:${data.org.supportEmail}`} className="underline">{data.org.supportEmail}</a>}{data.org.phone && <a href={`tel:${data.org.phone}`} className="underline">{data.org.phone}</a>}{data.org.whatsapp && <a href={`tel:${data.org.whatsapp}`} className="underline">WhatsApp: {data.org.whatsapp}</a>}</div>{(data.org.businessAddress || data.org.businessHours || data.org.timeZone) && <p className="mt-2">{[data.org.businessAddress, data.org.city, data.org.stateProvince, data.org.postalCode, data.org.country, data.org.businessHours, data.org.timeZone].filter(Boolean).join(", ")}</p>}</div>}
      </div>
    </div>
  );
}