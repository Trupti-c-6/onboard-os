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

export function clientInvitedEmail(orgName: string, portalUrl: string) {
  return {
    subject: `Action Required: Welcome & Onboarding with ${orgName}`,
    html: wrapper(`
      <h2>Welcome to ${orgName}</h2>
      <p>You've been invited to complete your onboarding. It only takes a few minutes.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Start Onboarding</a></p>
      <p style="color:#64748b;font-size:13px;">This link is unique to you — no password required.</p>
    `),
  };
}

export function stepRejectedEmail(orgName: string, portalUrl: string, reason: string) {
  return {
    subject: `Updates needed for your onboarding with ${orgName}`,
    html: wrapper(`
      <h2>A quick update needed</h2>
      <p>${orgName} requested a change to one of your submitted items:</p>
      <blockquote style="border-left:3px solid #ef4444;padding-left:12px;color:#334155;">${reason}</blockquote>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Review & Resubmit</a></p>
    `),
  };
}

export function nudgeReminderEmail(orgName: string, portalUrl: string) {
  return {
    subject: `Reminder: Complete your onboarding with ${orgName}`,
    html: wrapper(`
      <h2>Still waiting on you</h2>
      <p>Your onboarding with ${orgName} isn't finished yet. It only takes a few minutes.</p>
      <p><a href="${portalUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Continue Onboarding</a></p>
    `),
  };
}

export function onboardingSubmittedEmail(clientName: string, reviewUrl: string) {
  return {
    subject: `Onboarding Submitted: ${clientName} has completed their steps`,
    html: wrapper(`
      <h2>${clientName} is ready for review</h2>
      <p>All required onboarding steps have been submitted.</p>
      <p><a href="${reviewUrl}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Review Now</a></p>
    `),
  };
}
