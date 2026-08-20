import Link from "next/link";
import {
  CheckCircle2,
  FileStack,
  Inbox,
  Lock,
  Palette,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CAPABILITIES = [
  {
    icon: FileStack,
    title: "Reusable onboarding templates",
    description: "Build a workflow once, reuse it for every new client.",
  },
  {
    icon: Lock,
    title: "Secure client portal",
    description:
      "Clients complete their onboarding via a token-secured link — no account required.",
  },
  {
    icon: Upload,
    title: "File collection",
    description:
      "Collect documents and files directly through the portal, stored securely.",
  },
  {
    icon: Inbox,
    title: "Review queue",
    description:
      "See every submission in one place, ready for your team to work through.",
  },
  {
    icon: CheckCircle2,
    title: "Submission management",
    description:
      "Approve, reject, or request changes — with a full status history for every client.",
  },
  {
    icon: Palette,
    title: "Your branding",
    description:
      "Your logo and brand color, front and center on every client's portal.",
  },
];

const WORKFLOW_STEPS = [
  "Create a workflow",
  "Send to client",
  "Client completes it",
  "You review",
  "Approve",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <header className="font-medium text-slate-700">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            OnboardOS
          </span>

          <nav className="flex items-center">
            <Button
              asChild
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Link href="/login">Log in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Client onboarding, without the back-and-forth
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            OnboardOS turns your onboarding checklist into a secure, branded
            portal your clients can complete on their own — so you can review,
            approve, and move on.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="!border-slate-300 !bg-white !text-slate-900 !opacity-100 hover:!bg-slate-100 hover:!text-slate-900"
            >
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-slate-200 bg-slate-50"
        >
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold text-slate-900">
              How it works
            </h2>

            <ol className="mx-auto mt-10 flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {WORKFLOW_STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-3 sm:flex-col sm:text-center"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-medium text-white">
                    {i + 1}
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {step}
                  </span>

                  {i < WORKFLOW_STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="hidden h-px flex-1 bg-slate-300 sm:block sm:translate-y-[-14px]"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold text-slate-900">
            Everything you need to onboard clients
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="border-slate-200 bg-white p-6 text-slate-900"
              >
                <Icon className="h-6 w-6 text-slate-900" />

                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {title}
                </h3>

                <p className="mt-1.5 text-sm text-slate-600">
                  {description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-slate-200 bg-slate-900">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Ready to simplify onboarding?
            </h2>

            <p className="mt-3 text-slate-300">
              Set up your first workflow in minutes.
            </p>

            <div className="mt-6">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/login">Get started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <span>
            &copy; {new Date().getFullYear()} Assetivate. OnboardOS is a
            product of Assetivate.
          </span>

          <Link
            href="/login"
            className="font-medium text-slate-700 hover:text-slate-900"
          >
            Log in
          </Link>
        </div>
      </footer>
    </div>
  );
}