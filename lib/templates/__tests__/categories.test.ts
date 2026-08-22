import { describe, expect, it } from "vitest";
import { canonicalCategories } from "@/lib/templates/categories";

describe("template category taxonomy", () => {
  it("uses only persisted canonical category values", () => {
    expect(canonicalCategories([
      { category: "Agency" },
      { category: "Client Onboarding" },
      { category: "Client Onboarding" },
      { category: "" },
      { category: null },
    ])).toEqual(["Agency", "Client Onboarding"]);
  });

  it("does not derive a category from a template title", () => {
    expect(canonicalCategories([{ category: "Client Onboarding" }])).not.toContain("Standard Client Onboarding");
  });
});