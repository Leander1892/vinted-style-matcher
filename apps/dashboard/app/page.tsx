import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ScrapingToggle } from "./components/ScrapingToggle";

export const dynamic = "force-dynamic";

type Status =
  | {
      connected: true;
      scrapingEnabled: boolean;
      pendingCount: number;
      lastRun: {
        started_at: string;
        was_blocked: boolean;
        listings_found: number | null;
      } | null;
    }
  | { connected: false };

async function getStatus(): Promise<Status> {
  try {
    const [settingsRes, pendingRes, lastRunRes] = await Promise.all([
      supabase.from("app_settings").select("scraping_enabled").eq("id", 1).single(),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("review_status", "pending")
        .eq("is_highlight", true),
      supabase
        .from("scraper_runs")
        .select("started_at, was_blocked, listings_found")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (settingsRes.error) throw settingsRes.error;

    return {
      connected: true,
      scrapingEnabled: settingsRes.data?.scraping_enabled ?? false,
      pendingCount: pendingRes.count ?? 0,
      lastRun: lastRunRes.data ?? null,
    };
  } catch {
    return { connected: false };
  }
}

export default async function Home() {
  const status = await getStatus();

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-medium">Datenbank noch nicht verbunden</p>
        <p className="text-sm text-muted-foreground mt-2">
          Sobald <code>SUPABASE_URL</code> und{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code>{" "}
          gesetzt sind, erscheinen hier Status und Steuerung.
        </p>
      </div>
    );
  }

  const { scrapingEnabled, pendingCount, lastRun } = status;

  return (
    <div className="flex flex-col gap-6">
      <ScrapingToggle initialEnabled={scrapingEnabled} />

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-surface border border-border p-4">
          <p className="text-sm text-muted-foreground">Offene Highlights</p>
          <p className="text-2xl font-medium mt-1">{pendingCount}</p>
          <Link href="/review" className="text-sm text-accent mt-2 inline-block">
            Jetzt durchsehen →
          </Link>
        </div>

        <div className="rounded-xl bg-surface border border-border p-4">
          <p className="text-sm text-muted-foreground">Letzter Scraper-Lauf</p>
          {lastRun ? (
            <>
              <p className="text-2xl font-medium mt-1">
                {lastRun.was_blocked ? "Blockiert" : "OK"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {new Date(lastRun.started_at).toLocaleString("de-DE")}
                {lastRun.listings_found !== null &&
                  ` · ${lastRun.listings_found} Funde`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">Noch kein Lauf</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link
          href="/profile"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          Profil bearbeiten
        </Link>
        <Link
          href="/search-configs"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          Suchkonfiguration
        </Link>
        <Link
          href="/manual-check"
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          Peace manuell prüfen
        </Link>
      </div>
    </div>
  );
}
