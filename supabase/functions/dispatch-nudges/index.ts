// Deploy this via Supabase Dashboard → Edge Functions → Create Function
// (name it "dispatch-nudges"), paste this code, and deploy — no CLI needed.
//
// This does NOT run via `npm run dev` — it's a separate Deno runtime that
// Supabase hosts and triggers on the schedule you set up with pg_cron
// (see the accompanying SQL file). Test it by manually invoking it from
// the Edge Functions dashboard once deployed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL")!; // set this as a secret when deploying

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Find instances that are stuck: still in_progress, not nudged too many
  // times, and quiet for at least the configured interval (defaulting to
  // 24h here — matches "evaluate every hour" from FRS-05, using updated_at
  // as our activity proxy since we don't track a separate last_activity_at).
  const nudgeIntervalHours = 24;
  const cutoff = new Date(Date.now() - nudgeIntervalHours * 60 * 60 * 1000).toISOString();

  const { data: stalledInstances, error } = await supabase
    .from("client_instances")
    .select("id, client_name, client_email, access_token, nudge_count, max_nudges, organization_id")
    .eq("status", "in_progress")
    .lt("updated_at", cutoff);
  // Note: we can't compare nudge_count < max_nudges directly in a
  // PostgREST filter (it only compares a column to a literal, not to
  // another column), so that check happens per-row in the loop below,
  // which correctly respects each instance's own configured max_nudges.

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;

  for (const instance of stalledInstances ?? []) {
    if (instance.nudge_count >= instance.max_nudges) {
      await supabase.from("client_instances").update({ status: "stalled" }).eq("id", instance.id);
      continue;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", instance.organization_id)
      .single();

    const portalUrl = `${SITE_URL}/portal/${instance.access_token}`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OnboardOS <onboarding@resend.dev>",
        to: instance.client_email,
        subject: `Reminder: Complete your onboarding with ${org?.name ?? "your provider"}`,
        html: `<p>Your onboarding with ${org?.name ?? "your provider"} isn't finished yet.</p>
               <p><a href="${portalUrl}">Continue onboarding →</a></p>`,
      }),
    });

    if (emailRes.ok) {
      await supabase
        .from("client_instances")
        .update({
          nudge_count: instance.nudge_count + 1,
          last_nudged_at: new Date().toISOString(),
        })
        .eq("id", instance.id);
      sent++;
    }
  }

  return new Response(JSON.stringify({ checked: stalledInstances?.length ?? 0, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
