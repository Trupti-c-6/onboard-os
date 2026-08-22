// Matches Part 13 "Notification Engine" from the original blueprint.
// Kept as plain template functions (no react-email) to keep dependencies
// minimal — swap for React Email components later if styling needs grow.

function wrapper(bodyHtml: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      ${bodyHtml}
    </div>
  `;
}

// All values interpolated into these templates come from provider-entered
// data (org name, client name typed in by the provider, rejection reason
// written by a reviewer) rather than untrusted end-client input, so this
// isn't guarding against a live attack path today — but escaping on the way
// into an HTML email is correct practice regardless of the current call
// sites, and cheap enough that there's no reason not to.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type ClientInvitationDetails = {
  clientName: string;
  templateName: string;
  templateDescription?: string | null;
  category?: string | null;
  stepCount: number;
  company: {
    name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    contactPerson?: string | null;
    logoUrl?: string | null;
    address?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    postalCode?: string | null;
    country?: string | null;
    businessHours?: string | null;
    timeZone?: string | null;
    linkedin?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    x?: string | null;
  };
};

export function clientInvitedEmail(details: ClientInvitationDetails, portalUrl: string) {
  const { company } = details;
  const safeOrgName = escapeHtml(company.name);
  const safeClientName = escapeHtml(details.clientName);
  const safeTemplateName = escapeHtml(details.templateName);
  const safePortalUrl = escapeHtml(portalUrl);
  const optional = (label: string, value?: string | null) => value?.trim() ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : "";
  const link = (label: string, value?: string | null) => value?.trim() ? `<a href="${escapeHtml(value)}" style="margin-right:12px;">${label}</a>` : "";
  const address = [company.address, company.city, company.stateProvince, company.postalCode, company.country].filter((value) => value?.trim()).join(", ");
  return {
    subject: `Action Required: Welcome & Onboarding with ${company.name}`,
    html: wrapper(`
      ${company.logoUrl?.trim() ? `<p><img src="${escapeHtml(company.logoUrl)}" alt="${safeOrgName}" style="max-width:180px;max-height:64px;object-fit:contain;"></p>` : ""}
      <h2>${safeOrgName}</h2>
      <h3>You&apos;re invited to complete your onboarding</h3>
      <p>Hi ${safeClientName},</p>
      <p>${safeOrgName} invited you to complete <strong>${safeTemplateName}</strong>.</p>
      <hr>
      <h3>About your provider</h3>
      ${optional("Website", company.website)}
      ${optional("Email", company.email)}
      ${optional("Phone", company.phone)}
      ${optional("WhatsApp", company.whatsapp)}
      ${optional("Contact person", company.contactPerson)}
      ${address ? optional("Address", address) : ""}
      ${optional("Business hours", company.businessHours)}
      ${optional("Time zone", company.timeZone)}
      <p>${link("LinkedIn", company.linkedin)}${link("Instagram", company.instagram)}${link("Facebook", company.facebook)}${link("X", company.x)}</p>
      <hr>
      <h3>Your onboarding</h3>
      <p><strong>Template:</strong> ${safeTemplateName}</p>
      ${optional("Category", details.category)}
      ${optional("About this onboarding", details.templateDescription)}
      <p><strong>Steps:</strong> ${details.stepCount}</p>
      <h3>What to do</h3>
      <p>Complete the onboarding form and provide the requested information and documents.</p>
      <p><a href="${safePortalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Start Onboarding</a></p>
      <p style="color:#64748b;font-size:13px;">This link is unique to you — no password required.</p>
      <p>Need help? Reply to this email to contact ${safeOrgName}.${company.email?.trim() ? ` You can also reach us at ${escapeHtml(company.email)}.` : ""}</p>
      <p>${safeOrgName}${company.website?.trim() ? ` · ${escapeHtml(company.website)}` : ""}</p>
    `),
  };
}

export function stepRejectedEmail(orgName: string, portalUrl: string, reason: string) {
  const safeOrgName = escapeHtml(orgName);
  const safeReason = escapeHtml(reason);
  return {
    subject: `Updates needed for your onboarding with ${orgName}`,
    html: wrapper(`
      <h2>A quick update needed</h2>
      <p>${safeOrgName} requested a change to one of your submitted items:</p>
      <blockquote style="border-left:3px solid #ef4444;padding-left:12px;color:#334155;">${safeReason}</blockquote>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Review & Resubmit</a></p>
    `),
  };
}

export function nudgeReminderEmail(orgName: string, portalUrl: string) {
  const safeOrgName = escapeHtml(orgName);
  return {
    subject: `Reminder: Complete your onboarding with ${orgName}`,
    html: wrapper(`
      <h2>Still waiting on you</h2>
      <p>Your onboarding with ${safeOrgName} isn't finished yet. It only takes a few minutes.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Continue Onboarding</a></p>
    `),
  };
}

export function onboardingSubmittedEmail(clientName: string, reviewUrl: string) {
  const safeClientName = escapeHtml(clientName);
  return {
    subject: `Onboarding Submitted: ${clientName} has completed their steps`,
    html: wrapper(`
      <h2>${safeClientName} is ready for review</h2>
      <p>All required onboarding steps have been submitted.</p>
      <p><a href="${reviewUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Review Now</a></p>
    `),
  };
}

export function onboardingCompletedEmail(orgName: string, portalUrl: string) {
  const safeOrgName = escapeHtml(orgName);
  return {
    subject: `You're all set with ${orgName}`,
    html: wrapper(`
      <h2>Onboarding complete 🎉</h2>
      <p>${safeOrgName} has reviewed and approved everything you submitted. There's nothing left for you to do.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">View Summary</a></p>
    `),
  };
}
