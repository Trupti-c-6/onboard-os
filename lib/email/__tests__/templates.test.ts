import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  clientInvitedEmail,
  stepRejectedEmail,
  onboardingCompletedEmail,
} from "@/lib/email/templates";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert('x')</script> & "quotes"`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;quotes&quot;"
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Acme Consulting")).toBe("Acme Consulting");
  });
});

describe("email templates", () => {
  it("clientInvitedEmail includes the portal link and org name", () => {
    const { subject, html } = clientInvitedEmail("Acme Consulting", "https://example.com/portal/abc");
    expect(subject).toContain("Acme Consulting");
    expect(html).toContain("https://example.com/portal/abc");
    expect(html).toContain("Acme Consulting");
  });

  it("stepRejectedEmail escapes a reason containing HTML instead of injecting it raw", () => {
    const { html } = stepRejectedEmail(
      "Acme Consulting",
      "https://example.com/portal/abc",
      "<b>please redo this</b>"
    );
    expect(html).not.toContain("<b>please redo this</b>");
    expect(html).toContain("&lt;b&gt;please redo this&lt;/b&gt;");
  });

  it("onboardingCompletedEmail escapes an org name containing HTML", () => {
    const { html } = onboardingCompletedEmail(
      '<img src=x onerror=alert(1)>',
      "https://example.com/portal/abc"
    );
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;img");
  });
});
