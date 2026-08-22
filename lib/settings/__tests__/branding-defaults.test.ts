import { describe, expect, it } from "vitest";
import { resolveCompanyEmail } from "@/lib/settings/branding-defaults";

describe("company email default", () => {
  it("uses the authenticated user's email when no company email is stored", () => {
    expect(resolveCompanyEmail(null, "provider@example.com")).toBe("provider@example.com");
    expect(resolveCompanyEmail("", "provider@example.com")).toBe("provider@example.com");
  });

  it("preserves an explicitly saved company email", () => {
    expect(resolveCompanyEmail("contact@example.com", "provider@example.com")).toBe("contact@example.com");
  });

  it("returns an empty value when neither email exists", () => {
    expect(resolveCompanyEmail(undefined, null)).toBe("");
  });
});