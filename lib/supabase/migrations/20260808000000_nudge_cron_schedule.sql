-- Run this AFTER deploying the dispatch-nudges Edge Function.
-- Replace YOUR_PROJECT_REF and YOUR_ANON_KEY below with your real values
-- (Project Settings → API).

select cron.schedule(
  'dispatch-nudges-hourly',
  '0 * * * *', -- every hour, on the hour
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/dispatch-nudges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ANON_KEY'
    )
  );
  $$
);

-- To check it's registered:
-- select * from cron.job;

-- To remove it later:
-- select cron.unschedule('dispatch-nudges-hourly');
