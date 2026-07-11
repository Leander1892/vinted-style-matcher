import { supabase } from "@/lib/supabase";
import { getOrCreateDefaultProfile } from "@/lib/profile";
import * as actions from "./actions";

export const dynamic = "force-dynamic";

const CONDITIONS = ["neu mit Etikett", "sehr gut", "gut", "zufriedenstellend"];
const GARMENT_CATEGORIES = [
  { value: "oberteil", label: "Oberteil" },
  { value: "hose", label: "Hose" },
  { value: "jacke", label: "Jacke" },
  { value: "schuhe", label: "Schuhe" },
];
const FIT_TYPES = ["eng", "regular", "wide", "oversized"];
const RISE_TYPES = ["low", "mid", "high"];

export default async function ProfilePage() {
  let profile;
  try {
    profile = await getOrCreateDefaultProfile();
  } catch {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-medium">Datenbank noch nicht verbunden</p>
        <p className="text-sm text-muted-foreground mt-2">
          Sobald Supabase-Zugangsdaten in <code>.env.local</code> gesetzt
          sind, kannst du hier dein Profil pflegen.
        </p>
      </div>
    );
  }

  const profileId = profile.id;

  const [
    { data: styleDirections },
    { data: sizes },
    { data: fitRefs },
    { data: brands },
    { data: excludedCategories },
    { data: keywords },
    { data: colors },
    { data: materials },
    { data: silhouetteRules },
    { data: priceLimits },
    { data: conditionTarget },
  ] = await Promise.all([
    supabase.from("style_directions").select("id, name").eq("profile_id", profileId).order("name"),
    supabase.from("profile_sizes").select("id, category, size_label").eq("profile_id", profileId),
    supabase.from("profile_fit_references").select("*").eq("profile_id", profileId),
    supabase
      .from("profile_brands")
      .select("id, brand_name, preference, weight, style_direction_id")
      .eq("profile_id", profileId),
    supabase.from("profile_excluded_categories").select("id, category").eq("profile_id", profileId),
    supabase
      .from("profile_style_keywords")
      .select("id, keyword, weight, style_direction_id")
      .eq("profile_id", profileId),
    supabase
      .from("profile_colors")
      .select("id, color_name, role, style_direction_id")
      .eq("profile_id", profileId),
    supabase
      .from("profile_materials")
      .select("id, material, role, style_direction_id")
      .eq("profile_id", profileId),
    supabase
      .from("profile_silhouette_rules")
      .select("id, garment_category, fit_type, rise_type, notes, style_direction_id")
      .eq("profile_id", profileId),
    supabase.from("profile_price_limits").select("id, category, max_price_eur").eq("profile_id", profileId),
    supabase
      .from("profile_condition_target")
      .select("min_condition, max_condition")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);

  const directions = styleDirections ?? [];
  const directionName = (id: string | null) =>
    directions.find((d) => d.id === id)?.name ?? "alle Richtungen";
  const globalAvoidColors = (colors ?? []).filter((c) => c.style_direction_id === null);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-medium">Profil: {profile.display_name}</h1>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium">Stilrichtungen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Jede Richtung bündelt ihre eigene Farbpalette, Materialien und
          Passform-Regeln — statt einer losen Wortliste.
        </p>

        <div className="flex flex-col gap-6 mt-4">
          {directions.map((d) => (
            <StyleDirectionCard
              key={d.id}
              direction={d}
              colors={(colors ?? []).filter((c) => c.style_direction_id === d.id)}
              materials={(materials ?? []).filter((m) => m.style_direction_id === d.id)}
              silhouetteRules={(silhouetteRules ?? []).filter((s) => s.style_direction_id === d.id)}
            />
          ))}
        </div>

        {globalAvoidColors.length > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            Immer vermeiden (unabhängig von der Richtung):{" "}
            {globalAvoidColors.map((c) => c.color_name).join(", ")}
          </p>
        )}

        <form action={actions.addStyleDirection} className="flex gap-2 mt-5 pt-4 border-t border-border flex-wrap">
          <input name="name" placeholder="Neue Stilrichtung (z.B. Techwear)" className="input" />
          <SubmitButton />
        </form>
      </section>

      <Section title="Größen">
        <ul className="flex flex-col gap-2">
          {(sizes ?? []).map((s) => (
            <Row key={s.id} onDelete={actions.deleteSize.bind(null, s.id)}>
              {s.category}: {s.size_label}
            </Row>
          ))}
        </ul>
        <form action={actions.addSize} className="flex gap-2 mt-3 flex-wrap">
          <input name="category" placeholder="Kategorie (z.B. Oberteile)" className="input" />
          <input name="size_label" placeholder="Größe (z.B. M)" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section
        title="Passform-Referenzmaße"
        hint="Maße eines Kleidungsstücks, das dir bereits gut passt — die wichtigste Angabe im ganzen Profil. Bei Hosen ist die Beinöffnung entscheidend für 'wide leg'."
      >
        <ul className="flex flex-col gap-2">
          {(fitRefs ?? []).map((f) => (
            <Row key={f.id} onDelete={actions.deleteFitReference.bind(null, f.id)}>
              {f.category}: Brust {f.chest_cm ?? "–"}cm, Länge {f.length_cm ?? "–"}cm,
              Beinöffnung {f.hem_width_cm ?? "–"}cm, Rise {f.rise_type ?? "–"} (±{f.tolerance_cm}cm)
            </Row>
          ))}
        </ul>
        <form action={actions.upsertFitReference} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <input name="category" placeholder="Kategorie" className="input" required />
          <select name="source" className="input">
            <option value="own_garment">eigenes Kleidungsstück</option>
            <option value="body_measurement">Körpermaß</option>
          </select>
          <input name="chest_cm" placeholder="Brust cm" className="input" />
          <input name="length_cm" placeholder="Länge cm" className="input" />
          <input name="shoulder_cm" placeholder="Schulter cm" className="input" />
          <input name="sleeve_cm" placeholder="Ärmel cm" className="input" />
          <input name="armhole_width_cm" placeholder="Armloch cm" className="input" />
          <input name="waist_cm" placeholder="Taille cm" className="input" />
          <input name="inseam_cm" placeholder="Schrittlänge cm" className="input" />
          <input name="hem_width_cm" placeholder="Beinöffnung cm" className="input" />
          <input name="thigh_width_cm" placeholder="Oberschenkel cm" className="input" />
          <input name="knee_width_cm" placeholder="Knieweite cm" className="input" />
          <select name="rise_type" className="input" defaultValue="">
            <option value="">Rise (optional)</option>
            {RISE_TYPES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <input name="tolerance_cm" placeholder="Toleranz cm (Standard 3)" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Marken">
        <ul className="flex flex-col gap-2">
          {(brands ?? []).map((b) => (
            <Row key={b.id} onDelete={actions.deleteBrand.bind(null, b.id)}>
              {b.brand_name} · {b.preference} · {directionName(b.style_direction_id)}
            </Row>
          ))}
        </ul>
        <form action={actions.addBrand} className="flex gap-2 mt-3 flex-wrap">
          <input name="brand_name" placeholder="Marke" className="input" required />
          <select name="preference" className="input">
            <option value="preferred">bevorzugt</option>
            <option value="excluded">ausgeschlossen</option>
          </select>
          <DirectionSelect directions={directions} />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Ausgeschlossene Kategorien">
        <ul className="flex flex-col gap-2">
          {(excludedCategories ?? []).map((c) => (
            <Row key={c.id} onDelete={actions.deleteExcludedCategory.bind(null, c.id)}>
              {c.category}
            </Row>
          ))}
        </ul>
        <form action={actions.addExcludedCategory} className="flex gap-2 mt-3 flex-wrap">
          <input name="category" placeholder="Kategorie" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section
        title="Zusätzliche Suchbegriffe"
        hint="Nur für Wörter, die nicht schon über Farbe/Material/Silhouette abgedeckt sind — z.B. konkrete Modellnamen."
      >
        <ul className="flex flex-col gap-2">
          {(keywords ?? []).map((k) => (
            <Row key={k.id} onDelete={actions.deleteStyleKeyword.bind(null, k.id)}>
              {k.keyword} · {directionName(k.style_direction_id)}
            </Row>
          ))}
        </ul>
        <form action={actions.addStyleKeyword} className="flex gap-2 mt-3 flex-wrap">
          <input name="keyword" placeholder="Suchbegriff" className="input" required />
          <DirectionSelect directions={directions} />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Preisobergrenzen">
        {(() => {
          const allLimits = priceLimits ?? [];
          const general = allLimits.find((p) => p.category === "Alle");
          const specific = allLimits.filter((p) => p.category !== "Alle");
          return (
            <>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Allgemeine Obergrenze — gilt für alles, außer eine Kategorie
                  hat unten eine eigene Ausnahme.
                </p>
                <form action={actions.upsertPriceLimit} className="flex gap-2 items-center flex-wrap">
                  <input type="hidden" name="category" value="Alle" />
                  <input
                    name="max_price_eur"
                    placeholder="Max. Preis €"
                    defaultValue={general?.max_price_eur ?? ""}
                    className="input"
                    required
                  />
                  <span className="text-sm text-muted-foreground">€</span>
                  <SubmitButton />
                </form>
              </div>

              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-medium mb-1">Ausnahmen pro Kategorie</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Nur eintragen, wenn eine Kategorie bewusst von der
                  allgemeinen Grenze abweichen soll.
                </p>
                <ul className="flex flex-col gap-2">
                  {specific.map((p) => (
                    <Row key={p.id} onDelete={actions.deletePriceLimit.bind(null, p.id)}>
                      {p.category}: max. {p.max_price_eur} €
                    </Row>
                  ))}
                </ul>
                <form action={actions.upsertPriceLimit} className="flex gap-2 mt-3 flex-wrap">
                  <input name="category" placeholder="Kategorie (z.B. Schuhe)" className="input" required />
                  <input name="max_price_eur" placeholder="Max. Preis €" className="input" required />
                  <SubmitButton />
                </form>
              </div>
            </>
          );
        })()}
      </Section>

      <Section title="Zielzustand" hint="z.B. gut bis sehr gut, nicht zwingend neu">
        <form action={actions.upsertConditionTarget} className="flex gap-2 flex-wrap">
          <select name="min_condition" defaultValue={conditionTarget?.min_condition} className="input">
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="self-center text-muted-foreground">bis</span>
          <select name="max_condition" defaultValue={conditionTarget?.max_condition} className="input">
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <SubmitButton />
        </form>
      </Section>
    </div>
  );
}

function StyleDirectionCard({
  direction,
  colors,
  materials,
  silhouetteRules,
}: {
  direction: { id: string; name: string };
  colors: { id: string; color_name: string; role: string }[];
  materials: { id: string; material: string; role: string }[];
  silhouetteRules: {
    id: string;
    garment_category: string;
    fit_type: string | null;
    rise_type: string | null;
    notes: string | null;
  }[];
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{direction.name}</h3>
        <form action={actions.deleteStyleDirection.bind(null, direction.id)}>
          <button type="submit" className="text-muted-foreground hover:text-foreground" aria-label="Entfernen">
            ×
          </button>
        </form>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-3">
        <div>
          <p className="text-sm font-medium mb-1">Farben</p>
          <ul className="flex flex-col gap-1 mb-2">
            {colors.map((c) => (
              <Row key={c.id} onDelete={actions.deleteColor.bind(null, c.id)}>
                <span className="text-sm">{c.color_name} · {c.role}</span>
              </Row>
            ))}
          </ul>
          <form action={actions.addColor} className="flex flex-col gap-1">
            <input type="hidden" name="style_direction_id" value={direction.id} />
            <input name="color_name" placeholder="Farbe" className="input" required />
            <select name="role" className="input">
              <option value="basis">Basis</option>
              <option value="akzent">Akzent</option>
              <option value="vermeiden">Vermeiden</option>
            </select>
            <SubmitButton small />
          </form>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Materialien</p>
          <ul className="flex flex-col gap-1 mb-2">
            {materials.map((m) => (
              <Row key={m.id} onDelete={actions.deleteMaterial.bind(null, m.id)}>
                <span className="text-sm">{m.material} · {m.role}</span>
              </Row>
            ))}
          </ul>
          <form action={actions.addMaterial} className="flex flex-col gap-1">
            <input type="hidden" name="style_direction_id" value={direction.id} />
            <input name="material" placeholder="Material" className="input" required />
            <select name="role" className="input">
              <option value="bevorzugt">Bevorzugt</option>
              <option value="vermeiden">Vermeiden</option>
            </select>
            <SubmitButton small />
          </form>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Silhouette</p>
          <ul className="flex flex-col gap-1 mb-2">
            {silhouetteRules.map((s) => (
              <Row key={s.id} onDelete={actions.deleteSilhouetteRule.bind(null, s.id)}>
                <span className="text-sm">
                  {s.garment_category}: {s.fit_type ?? "–"}
                  {s.rise_type ? `, Rise ${s.rise_type}` : ""}
                  {s.notes ? ` (${s.notes})` : ""}
                </span>
              </Row>
            ))}
          </ul>
          <form action={actions.upsertSilhouetteRule} className="flex flex-col gap-1">
            <input type="hidden" name="style_direction_id" value={direction.id} />
            <select name="garment_category" className="input" required>
              {GARMENT_CATEGORIES.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            <select name="fit_type" className="input">
              <option value="">Fit (optional)</option>
              {FIT_TYPES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select name="rise_type" className="input">
              <option value="">Rise (optional)</option>
              {RISE_TYPES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input name="notes" placeholder="Notiz (z.B. Bundfalte)" className="input" />
            <SubmitButton small />
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => Promise<void>;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm border-b border-border pb-2 last:border-0">
      <span>{children}</span>
      <form action={onDelete}>
        <button type="submit" className="text-muted-foreground hover:text-foreground" aria-label="Entfernen">
          ×
        </button>
      </form>
    </li>
  );
}

function DirectionSelect({ directions }: { directions: { id: string; name: string }[] }) {
  return (
    <select name="style_direction_id" className="input">
      <option value="">alle Richtungen</option>
      {directions.map((d) => (
        <option key={d.id} value={d.id}>{d.name}</option>
      ))}
    </select>
  );
}

function SubmitButton({ small }: { small?: boolean }) {
  return (
    <button
      type="submit"
      className={`rounded-lg bg-accent text-accent-foreground h-fit self-start ${
        small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      Hinzufügen
    </button>
  );
}
