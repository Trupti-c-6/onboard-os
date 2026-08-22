import { Resend } from "resend";

export type SendEmailResult = {
  success: boolean;
  skipped?: boolean;
  error?: string;
};

export type SendEmailOptions = {
  replyTo?: string;
};

export function getEmailConfiguration() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    fromAddress: process.env.RESEND_FROM_EMAIL?.trim() ?? "",
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options: SendEmailOptions = {}
): Promise<SendEmailResult> {
  const { apiKey, fromAddress } = getEmailConfiguration();
  const resend = apiKey ? new Resend(apiKey) : null;
  if (!resend) {
    const error = "RESEND_API_KEY is not configured.";
    console.error(`[email failed] ${error} To: ${to} | Subject: ${subject}`);

    return {
      success: false,
      skipped: true,
      error,
    };
  }

  if (!fromAddress) {
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
      from: fromAddress,
      to,
      subject,
      html,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });

    if (result.error) {
      const error = result.error.message ?? "Resend rejected the send request.";
      console.error("Resend send failed:", {
        operation: "client invitation email",
        name: result.error.name,
        statusCode: (result.error as { statusCode?: number }).statusCode,
        message: error,
      });

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
    console.error("Resend send failed:", {
      operation: "client invitation email",
      message: error,
    });

    return {
      success: false,
      skipped: false,
      error,
    };
  }
}