import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type AiSummary = {
  summary: string;
  missingOrUnclear: string[];
  suggestedQuestions: string[];
} | null;

export function AiSummaryCard({ summary }: { summary: AiSummary }) {
  if (!summary) return null;

  return (
    <Card className="border-primary/25 bg-[linear-gradient(180deg,rgba(124,58,237,0.08),transparent_60%)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6 text-sm">
        <p className="text-zinc-300">{summary.summary}</p>

        {summary.missingOrUnclear.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Missing or unclear
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-zinc-300">
              {summary.missingOrUnclear.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.suggestedQuestions.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Suggested questions
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-zinc-300">
              {summary.suggestedQuestions.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}