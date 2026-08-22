import { describe, expect, it } from "vitest";
import { isOwnedCustomTemplate, isStarterTemplate, ownedTemplateCopyFields } from "@/lib/templates/classification";

describe("template classification", () => {
  const organizationId = "org-123";

  it("keeps category-independent starter semantics", () => {
    expect(isStarterTemplate({ organization_id: null, is_starter: true })).toBe(true);
    expect(isStarterTemplate({ organization_id: organizationId, is_starter: true })).toBe(false);
    expect(isStarterTemplate({ organization_id: organizationId, is_starter: false })).toBe(false);
  });

  it("classifies a copied starter as an owned custom template", () => {
    expect(isOwnedCustomTemplate({ organization_id: organizationId, is_starter: false }, organizationId)).toBe(true);
    expect(isStarterTemplate({ organization_id: organizationId, is_starter: false })).toBe(false);
  });

  it("rejects starter-like or cross-tenant rows as owned custom templates", () => {
    expect(isOwnedCustomTemplate({ organization_id: null, is_starter: true }, organizationId)).toBe(false);
    expect(isOwnedCustomTemplate({ organization_id: "other-org", is_starter: false }, organizationId)).toBe(false);
  });

  it("creates an owned custom copy without changing its workflow category", () => {
    expect(ownedTemplateCopyFields("Agency", organizationId)).toEqual({
      organization_id: organizationId,
      category: "Agency",
      is_starter: false,
    });
  });
});