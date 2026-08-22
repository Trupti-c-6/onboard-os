"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCompanyLogoUpload, updateOrganizationBranding, type UpdateBrandingState } from "@/lib/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = Record<string, string>;
const initialState: UpdateBrandingState = { success: false, message: "" };
const fieldClass = "flex w-full rounded-md border border-input-border bg-input px-3 py-2 text-sm text-foreground";

function Field({ id, label, type = "text", value, placeholder }: { id: string; label: string; type?: string; value: string; placeholder?: string }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={id} type={type} defaultValue={value} placeholder={placeholder} /></div>;
}

export function BrandingForm({ initial }: { initial: Initial }) {
  const [state, formAction, isPending] = useActionState(updateOrganizationBranding, initialState);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [brandColor, setBrandColor] = useState(initial.brandColor);
  const [logoMessage, setLogoMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadLogo(file: File) {
    setUploading(true); setLogoMessage("");
    const signed = await createCompanyLogoUpload(file.name, file.type, file.size);
    if (!signed.success || !signed.path || !signed.uploadToken || !signed.publicUrl) { setLogoMessage(signed.message); setUploading(false); return; }
    const { error } = await createClient().storage.from("company-logos").uploadToSignedUrl(signed.path, signed.uploadToken, file);
    setLogoMessage(error ? "Logo upload failed. Please try again." : "Logo uploaded. Save changes to keep it.");
    if (!error) setLogoUrl(signed.publicUrl);
    setUploading(false);
  }

  return <form action={formAction} className="space-y-6">
    <section className="space-y-4"><h2 className="text-lg font-semibold text-foreground">Company Information</h2><Field id="name" label="Company name" value={initial.name} /><Field id="websiteUrl" label="Website" type="url" value={initial.websiteUrl} placeholder="https://example.com" /><Field id="industry" label="Industry / Business type" value={initial.industry} /><div className="space-y-1.5"><Label htmlFor="description">About your company</Label><textarea id="description" name="description" defaultValue={initial.description} rows={4} className={fieldClass} /><p className="text-xs text-slate-400">Add a short introduction your clients can see during onboarding.</p></div></section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="text-lg font-semibold text-foreground">Contact Details</h2><Field id="supportEmail" label="Email" type="email" value={initial.supportEmail} placeholder="provider@example.com" /><p className="text-xs text-slate-400">Email address your clients can use to contact you.</p><Field id="phone" label="Phone number" value={initial.phone} /><Field id="whatsapp" label="WhatsApp number" value={initial.whatsapp} /><Field id="contactPerson" label="Contact person name" value={initial.contactPerson} /></section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="text-lg font-semibold text-foreground">Branding</h2><div className="space-y-1.5"><Label htmlFor="logoFile">Company logo</Label><Input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} /><p className="text-xs text-slate-400">Accepted formats: PNG, JPG, JPEG, WEBP, SVG.</p>{logoMessage && <p className="text-xs text-amber-400">{logoMessage}</p>}{logoUrl && <img src={logoUrl} alt="Company logo preview" className="h-12 max-w-[180px] object-contain" />}</div><div className="space-y-1.5"><Label htmlFor="logoUrl">Logo URL</Label><Input id="logoUrl" name="logoUrl" type="url" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="https://example.com/logo.png" /></div><p className="text-xs text-slate-400">Optional alternative if your logo is hosted elsewhere.</p><div className="space-y-1.5"><Label htmlFor="brandColor">Brand color</Label><div className="flex gap-2"><input type="color" aria-label="Brand color picker" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} className="h-10 w-12 rounded-md border border-slate-200" /><Input id="brandColor" name="brandColor" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} pattern="^#[0-9a-fA-F]{6}$" /></div></div><Field id="secondaryColor" label="Secondary/accent color" value={initial.secondaryColor} placeholder="#7c3aed" /><Field id="faviconUrl" label="Favicon URL" type="url" value={initial.faviconUrl} /></section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="text-lg font-semibold text-foreground">Business Details</h2><Field id="businessAddress" label="Business address" value={initial.businessAddress} /><div className="grid gap-4 sm:grid-cols-2"><Field id="city" label="City" value={initial.city} /><Field id="stateProvince" label="State / Province" value={initial.stateProvince} /><Field id="postalCode" label="Postal / ZIP code" value={initial.postalCode} /><Field id="country" label="Country" value={initial.country} /><Field id="businessHours" label="Business hours" value={initial.businessHours} /><Field id="timeZone" label="Time zone" value={initial.timeZone} /></div></section>
    <section className="space-y-4 border-t border-border pt-6"><h2 className="text-lg font-semibold text-foreground">Online Presence</h2><div className="grid gap-4 sm:grid-cols-2"><Field id="linkedinUrl" label="LinkedIn" type="url" value={initial.linkedinUrl} /><Field id="instagramUrl" label="Instagram" type="url" value={initial.instagramUrl} /><Field id="facebookUrl" label="Facebook" type="url" value={initial.facebookUrl} /><Field id="xUrl" label="X / Twitter" type="url" value={initial.xUrl} /></div></section>
    <div className="flex items-center gap-3"><Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>{state.message && <p className={`text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</p>}</div>
  </form>;
}
