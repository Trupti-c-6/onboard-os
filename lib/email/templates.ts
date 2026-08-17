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

export function clientInvitedEmail(orgName: string, portalUrl: string) {
  const safeOrgName = escapeHtml(orgName);
  return {
    subject: `Action Required: Welcome & Onboarding with ${orgName}`,
    html: wrapper(`
      <h2>Welcome to ${safeOrgName}</h2>
      <p>You've been invited to complete your onboarding. It only takes a few minutes.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Start Onboarding</a></p>
      <p style="color:#64748b;font-size:13px;">This link is unique to you — no password required.</p>
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
