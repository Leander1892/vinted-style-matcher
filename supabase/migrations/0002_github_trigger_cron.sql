create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- The actual token is inserted separately via vault.create_secret(), run
-- directly against the DB (never committed to this file / git history),
-- since this repo is public. This migration only wires up the plumbing
-- that reads it back out at call time.

create or replace function trigger_scraper_spike_workflow()
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  token text;
begin
  select decrypted_secret into token
  from vault.decrypted_secrets
  where name = 'github_actions_trigger_token';

  perform net.http_post(
    url := 'https://api.github.com/repos/Leander1892/vinted-style-matcher/actions/workflows/scraper-spike.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('ref', 'master')
  );
end;
$$;

select cron.schedule(
  'trigger-scraper-spike-every-20-min',
  '*/20 * * * *',
  $$select trigger_scraper_spike_workflow();$$
);
