import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL;

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  // Resend is not configured
  if (!resend) {
    console.warn(
      `[email skipped — no RESEND_API_KEY set] To: ${to} | Subject: ${subject}`
    );

    return {
      success: false,
      skipped: true,
    };
  }

  // Sender address is not configured
  if (!FROM_ADDRESS) {
    console.error(
      "[email failed — RESEND_FROM_EMAIL is not configured]"
    );

    return {
      success: false,
      skipped: false,
    };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend send failed:", result.error);

      return {
        success: false,
        skipped: false,
      };
    }

    console.log(
      `Email sent successfully to ${to}. Email ID: ${result.data?.id}`
    );

    return {
      success: true,
      skipped: false,
    };
  } catch (err) {
    console.error("Resend send failed:", err);

    return {
      success: false,
      skipped: false,
    };
  }
}