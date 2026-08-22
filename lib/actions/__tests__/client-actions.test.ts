import { afterEach, describe, expect, it } from "vitest";
import { getPortalUrl } from "@/lib/email/portal-url";

describe("client portal URL", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("uses the configured origin and token", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://onboard.example/ignored-path/";
    expect(getPortalUrl("token-123")).toBe("https://onboard.example/portal/token-123");
  });

  it("rejects missing or unsafe origins", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getPortalUrl("token-123")).toBeNull();
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    expect(getPortalUrl("token-123")).toBeNull();
  });
});