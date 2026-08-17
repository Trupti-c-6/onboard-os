import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { summarizeSubmission } from "@/lib/ai/provider";

const originalEnv = { ...process.env };

describe("summarizeSubmission", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null with no API call when no provider key is configured", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await summarizeSubmission("Jane Doe", [
      {
        title: "Company name",
        type: "short_text",
        isRequired: true,
        valueText: "Acme",
        valueJson: null,
        hasFiles: false,
      },
    ]);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null (not fake data) when there are no steps to summarize", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await summarizeSubmission("Jane Doe", []);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parses a well-formed Gemini response into a SubmissionSummary", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const modelJson = JSON.stringify({
      summary: "Client submitted company info and a logo.",
      missingOrUnclear: ["Tax ID looks blank"],
      suggestedQuestions: ["What's your preferred launch date?"],
    });

    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: modelJson }] } }],
      }),
    } as Response);

    const result = await summarizeSubmission("Jane Doe", [
      {
        title: "Company name",
        type: "short_text",
        isRequired: true,
        valueText: "Acme",
        valueJson: null,
        hasFiles: false,
      },
    ]);

    expect(result).toEqual({
      summary: "Client submitted company info and a logo.",
      missingOrUnclear: ["Tax ID looks blank"],
      suggestedQuestions: ["What's your preferred launch date?"],
    });
  });

  it("returns null instead of throwing when the provider call fails", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false } as Response);

    const result = await summarizeSubmission("Jane Doe", [
      {
        title: "Company name",
        type: "short_text",
        isRequired: true,
        valueText: "Acme",
        valueJson: null,
        hasFiles: false,
      },
    ]);

    expect(result).toBeNull();
  });

  it("returns null instead of throwing when fetch itself rejects (network error)", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    const result = await summarizeSubmission("Jane Doe", [
      {
        title: "Company name",
        type: "short_text",
        isRequired: true,
        valueText: "Acme",
        valueJson: null,
        hasFiles: false,
      },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when the model response isn't valid JSON, rather than guessing", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json at all" }] } }],
      }),
    } as Response);

    const result = await summarizeSubmission("Jane Doe", [
      {
        title: "Company name",
        type: "short_text",
        isRequired: true,
        valueText: "Acme",
        valueJson: null,
        hasFiles: false,
      },
    ]);

    expect(result).toBeNull();
  });
});
