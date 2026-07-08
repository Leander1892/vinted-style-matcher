-- Same reliability fix as the spike trigger: GitHub's own schedule event
-- can't be trusted, so this dispatches the real scraper workflow via the
-- GitHub API on a real Postgres cron schedule. Reuses the same vault
-- secret as the spike trigger (same repo, same Actions:write token).
create or replace function trigger_scraper_workflow()
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
    url := 'https://api.github.com/repos/Leander1892/vinted-style-matcher/actions/workflows/scraper.yml/dispatches',
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
  'trigger-scraper-every-20-min',
  '*/20 * * * *',
  $$select trigger_scraper_workflow();$$
);
