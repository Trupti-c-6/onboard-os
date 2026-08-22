import { afterEach, describe, expect, it } from "vitest";
import { getEmailConfiguration } from "@/lib/email/resend-client";

describe("Resend configuration", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it("reads sender configuration without exposing or transforming secrets", () => {
    process.env.RESEND_API_KEY = "secret-test-key";
    process.env.RESEND_FROM_EMAIL = "  onboarding@example.com  ";
    expect(getEmailConfiguration()).toEqual({ apiKey: "secret-test-key", fromAddress: "onboarding@example.com" });
  });

  it("represents a missing sender as unconfigured", () => {
    delete process.env.RESEND_FROM_EMAIL;
    expect(getEmailConfiguration().fromAddress).toBe("");
  });
});