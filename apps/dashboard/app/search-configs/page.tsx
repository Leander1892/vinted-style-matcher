import { supabase } from "@/lib/supabase";
import { getOrCreateDefaultProfile } from "@/lib/profile";
import * as actions from "./actions";

export const dynamic = "force-dynamic";

export default async function SearchConfigsPage() {
  let profile;
  try {
    profile = await getOrCreateDefaultProfile();
  } catch {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-medium">Datenbank noch nicht verbunden</p>
        <p className="text-sm text-muted-foreground mt-2">
          Sobald Supabase-Zugangsdaten in <code>.env.local</code> gesetzt
          sind, kannst du hier Suchen anlegen.
        </p>
      </div>
    );
  }

  const { data: configs } = await supabase
    .from("search_configs")
    .select("id, name, search_text, price_to, poll_interval_minutes, is_active, last_polled_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">Suchkonfiguration</h1>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-muted-foreground mb-4">
          Jede Suche läuft als eigener freier Textbegriff gegen Vinted, mit
          eigener Preisgrenze. Marken-/Größen-/Kategorie-Filter mit echten
          Vinted-IDs kommen dazu, sobald der Scraper diese Zuordnung selbst
          herausgefunden hat — bis dahin reicht freier Text meist schon gut.
        </p>

        <ul className="flex flex-col gap-3 mb-4">
          {(configs ?? []).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0"
            >
              <div className="text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground">
                  {c.search_text ? `"${c.search_text}"` : "kein Suchtext"}
                  {c.price_to != null && ` · bis ${c.price_to} €`}
                  {` · alle ${c.poll_interval_minutes} Min`}
                  {c.last_polled_at
                    ? ` · zuletzt ${new Date(c.last_polled_at).toLocaleString("de-DE")}`
                    : " · noch nie gelaufen"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <form action={actions.toggleSearchConfig.bind(null, c.id, !c.is_active)}>
                  <button
                    type="submit"
                    className={`rounded-lg border border-border px-3 py-1.5 text-sm ${
                      c.is_active ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {c.is_active ? "aktiv" : "pausiert"}
                  </button>
                </form>
                <form action={actions.deleteSearchConfig.bind(null, c.id)}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-foreground px-1"
                    aria-label="Entfernen"
                  >
                    ×
                  </button>
                </form>
              </div>
            </li>
          ))}
          {(configs ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Noch keine Suche angelegt.</p>
          )}
        </ul>

        <form action={actions.addSearchConfig} className="flex gap-2 flex-wrap">
          <input name="name" placeholder="Name (z.B. Weite Jeans)" className="input" required />
          <input name="search_text" placeholder="Suchtext (z.B. wide leg jeans)" className="input" />
          <input name="price_to" placeholder="Preis bis €" className="input" />
          <input
            name="poll_interval_minutes"
            placeholder="Intervall Min (Standard 20)"
            className="input"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm h-fit self-start"
          >
            Hinzufügen
          </button>
        </form>
      </div>
    </div>
  );
}
