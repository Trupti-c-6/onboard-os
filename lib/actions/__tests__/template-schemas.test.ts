import { describe, expect, it } from "vitest";
import { CreateTemplateSchema, MAX_FILE_SIZE_BYTES, sanitizeStepForType } from "@/lib/actions/template-schemas";

const step = (type: string, validation_rules: Record<string, unknown> = {}) => ({
  title: "A step",
  description: "A client-facing prompt",
  type,
  is_required: true,
  validation_rules,
});

describe("template validation", () => {
  it("rejects choice steps with fewer than two options", () => {
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("multi_select")] }).success).toBe(false);
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("multi_select", { options: ["One"] })] }).success).toBe(false);
  });

  it("accepts two unique non-empty choice options", () => {
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("multi_select", { options: ["One", "Two"] })] }).success).toBe(true);
  });

  it("rejects empty, whitespace-only, and duplicate options", () => {
    for (const options of [["", "Two"], ["   ", "Two"], ["One", "one"]]) {
      expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("single_select", { options })] }).success).toBe(false);
    }
  });

  it("validates file size and accepted types", () => {
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("file_upload", { max_size_bytes: 0 })] }).success).toBe(false);
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("file_upload", { max_size_bytes: MAX_FILE_SIZE_BYTES + 1 })] }).success).toBe(false);
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("file_upload", { accepted_types: ["pdf", "png"] })] }).success).toBe(false);
    expect(CreateTemplateSchema.safeParse({ title: "Template", steps: [step("file_upload", { accepted_types: [".pdf", "image/png"], max_size_bytes: 10 * 1024 * 1024 })] }).success).toBe(true);
  });

  it("removes stale type-specific configuration when a step changes type", () => {
    expect(sanitizeStepForType({ type: "long_text", validation_rules: { options: ["One", "Two"], max_size_bytes: 10 } }).validation_rules).toEqual({});
    expect(sanitizeStepForType({ type: "file_upload", validation_rules: { options: ["One", "Two"], accepted_types: [".pdf"] } }).validation_rules).toEqual({ accepted_types: [".pdf"] });
    expect(sanitizeStepForType({ type: "single_select", validation_rules: { accepted_types: [".pdf"], options: ["One", "Two"] } }).validation_rules).toEqual({ options: ["One", "Two"] });
  });
});
