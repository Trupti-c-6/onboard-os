"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const initialState: LoginState = { success: false, message: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(sendMagicLink, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome to OnboardOS</CardTitle>
          <CardDescription>
            Enter your email — we&apos;ll send you a secure login link. No password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <Input
              type="email"
              name="email"
              placeholder="you@youragency.com"
              required
              disabled={isPending}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
          {state.message && (
            <p className={`mt-4 text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
              {state.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}