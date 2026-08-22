"use client";

import { useActionState } from "react";
import { updateOrganizationBranding, type UpdateBrandingState } from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = {
  name: string;
  logoUrl: string;
  brandColor: string;
  supportEmail: string;
};

const initialState: UpdateBrandingState = { success: false, message: "" };

export function BrandingForm({ initial }: { initial: Initial }) {
  const [state, formAction, isPending] = useActionState(updateOrganizationBranding, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Company name</Label>
        <Input id="name" name="name" defaultValue={initial.name} required maxLength={255} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          placeholder="https://example.com/logo.png"
          defaultValue={initial.logoUrl}
        />
        <p className="text-xs text-muted-foreground">
          Shown at the top of every client onboarding portal. Leave blank to show your company
          name only.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="brandColor">Brand color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="Brand color picker"
            defaultValue={initial.brandColor}
            className="h-10 w-12 cursor-pointer rounded-lg border border-input-border bg-input"
            onChange={(e) => {
              const text = document.getElementById("brandColor") as HTMLInputElement | null;
              if (text) text.value = e.target.value;
            }}
          />
          <Input
            id="brandColor"
            name="brandColor"
            defaultValue={initial.brandColor}
            pattern="^#[0-9a-fA-F]{6}$"
            placeholder="#0f172a"
            className="max-w-[140px]"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Used for the progress bar and primary buttons in the client portal.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="supportEmail">Support email</Label>
        <Input
          id="supportEmail"
          name="supportEmail"
          type="email"
          placeholder="support@yourcompany.com"
          defaultValue={initial.supportEmail}
        />
        <p className="text-xs text-muted-foreground">
          Shown to clients if their onboarding link has expired.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}