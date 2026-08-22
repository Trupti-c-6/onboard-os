// Minimal, dependency-free AI provider abstraction for the "onboarding
// reviewer" assistant. Deliberately uses raw fetch() rather than each
// vendor's SDK, since all we need is one JSON-in/JSON-out call and adding
// three SDKs for that would be a lot of surface area for little benefit.
//
// Graceful degradation is the point of this file: if no provider key is
// configured, every exported function resolves to null rather than
// throwing, and callers (see lib/portal/shared.ts) treat that as "skip the
// AI step" rather than an error. We never fabricate a summary — a missing
// key means no summary, not a fake one.

export type SubmissionSummary = {
  summary: string;
  missingOrUnclear: string[];
  suggestedQuestions: string[];
};

export type SubmissionStepInput = {
  title: string;
  type: string;
  isRequired: boolean;
  valueText: string | null;
  valueJson: Record<string, unknown> | null;
  hasFiles: boolean;
};

const SYSTEM_PROMPT = `You are an onboarding reviewer assistant. You will be given a client's
onboarding submission as a list of steps with their answers. Respond with ONLY a JSON object
(no markdown fences, no commentary) matching exactly this shape:
{
  "summary": "2-4 sentence plain-language overview of what the client submitted",
  "missingOrUnclear": ["short phrase per item that looks missing, blank, or ambiguous"],
  "suggestedQuestions": ["short question a reviewer might want to ask the client, if any"]
}
If nothing looks missing or unclear, return an empty array for that field. Do not invent
information that isn't in the submission.`;

function buildUserPrompt(clientName: string, steps: SubmissionStepInput[]): string {
  const lines = steps.map((s, i) => {
    const answer = s.hasFiles
      ? "[file(s) uploaded]"
      : s.valueText ?? (s.valueJson ? JSON.stringify(s.valueJson) : "[no answer]");
    return `${i + 1}. ${s.title}${s.isRequired ? " (required)" : ""} — ${answer}`;
  });
  return `Client: ${clientName}\n\nSubmission:\n${lines.join("\n")}`;
}

function parseModelJson(raw: string): SubmissionSummary | null {
  try {
    // Models occasionally wrap JSON in ```json fences despite instructions
    // not to — strip those defensively before parsing.
    const cleaned = raw.replace(/^```json\s*|```\s*$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.summary !== "string") return null;
    return {
      summary: parsed.summary,
      missingOrUnclear: Array.isArray(parsed.missingOrUnclear) ? parsed.missingOrUnclear : [],
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions
        : [],
    };
  } catch {
    return null;
  }
}

async function callGemini(userPrompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callOpenAI(userPrompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

// Provider selection: whichever key is present, checked in this order. No
// key configured at all is the expected default state — return null, don't
// throw, don't fabricate a summary.
export async function summarizeSubmission(
  clientName: string,
  steps: SubmissionStepInput[]
): Promise<SubmissionSummary | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) return null;
  if (steps.length === 0) return null;

  const userPrompt = buildUserPrompt(clientName, steps);

  try {
    const raw = geminiKey
      ? await callGemini(userPrompt, geminiKey)
      : await callOpenAI(userPrompt, openaiKey as string);
    if (!raw) return null;
    return parseModelJson(raw);
  } catch {
    // Network error, rate limit, malformed response, etc. — this is a
    // best-effort enhancement, never something that should break the
    // submission flow that triggered it.
    return null;
  }
}
