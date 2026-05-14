-- Phase 5f — schedule a pure-SQL hourly job that deactivates expired ads.
-- Replaces the unused supabase/functions/deactivate-expired-ads edge function
-- — same effect, no HTTP hop, no additional deploy step.

create extension if not exists pg_cron with schema pg_catalog;

-- Unschedule any previous run (idempotent re-apply).
do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname = 'deactivate_expired_ads' loop
    perform cron.unschedule(j.jobid);
  end loop;
end $$;

select cron.schedule(
  'deactivate_expired_ads',
  '0 * * * *',  -- every hour, on the hour
  $$
    update public.ad
       set is_active = false,
           updated_at = now()
     where is_active = true
       and end_date is not null
       and end_date < now();
  $$
);

-- One-shot run right now to flush the currently-expired backlog (ad #2 in the
-- audit was past 2026-04-30 but still active because no cron was running).
update public.ad
   set is_active = false,
       updated_at = now()
 where is_active = true
   and end_date is not null
   and end_date < now();
