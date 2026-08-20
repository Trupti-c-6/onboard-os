import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL;

export type SendEmailResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  if (!resend) {
    const error = "RESEND_API_KEY is not configured.";
    console.error(`[email failed] ${error} To: ${to} | Subject: ${subject}`);

    return {
      success: false,
      skipped: true,
      error,
    };
  }

  if (!FROM_ADDRESS) {
    const error = "RESEND_FROM_EMAIL is not configured.";
    console.error(`[email failed] ${error} To: ${to} | Subject: ${subject}`);

    return {
      success: false,
      skipped: false,
      error,
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
      const error = result.error.message ?? "Resend rejected the send request.";
      console.error("Resend send failed:", error);

      return {
        success: false,
        skipped: false,
        error,
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
    const error =
      err instanceof Error ? err.message : "Unexpected error while sending email.";
    console.error("Resend send failed:", error);

    return {
      success: false,
      skipped: false,
      error,
    };
  }
}