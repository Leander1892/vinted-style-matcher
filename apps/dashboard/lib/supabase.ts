import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role key on purpose: every DB call in this app happens in Server
// Components/Actions, never in the browser, and RLS is intentionally left
// off (single-user tool, no public API). "server-only" makes any accidental
// client-side import a build error instead of a leaked key.
//
// Lazily constructed: throwing only on first real use (not at module import)
// lets pages build and render a "not connected yet" state before Supabase
// credentials exist, instead of failing the whole build.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Supabase ist noch nicht konfiguriert (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY fehlen)."
      );
    }
    client = createClient(url, key);
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
