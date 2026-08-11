import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "OnboardOS <onboarding@resend.dev>";

// If RESEND_API_KEY isn't set yet (e.g. you haven't created a Resend account
// during this milestone), we log instead of sending and crashing — so the
// rest of the app keeps working while you set that up on your own schedule.
export async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(
      `[email skipped — no RESEND_API_KEY set] To: ${to} | Subject: ${subject}`
    );
    return { success: true, skipped: true };
  }

  try {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
    return { success: true, skipped: false };
  } catch (err) {
    console.error("Resend send failed:", err);
    return { success: false, skipped: false };
  }
}
