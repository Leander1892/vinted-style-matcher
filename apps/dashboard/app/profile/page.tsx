import { supabase } from "@/lib/supabase";
import { getOrCreateDefaultProfile } from "@/lib/profile";
import * as actions from "./actions";

export const dynamic = "force-dynamic";

const CONDITIONS = ["neu mit Etikett", "sehr gut", "gut", "zufriedenstellend"];

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
      .select("id, color_name, preference, style_direction_id")
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

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-medium">Profil: {profile.display_name}</h1>

      <Section title="Stilrichtungen" hint="z.B. Vintage, Casual, Italian Smart Casual">
        <ul className="flex flex-col gap-2">
          {directions.map((d) => (
            <Row key={d.id} onDelete={actions.deleteStyleDirection.bind(null, d.id)}>
              {d.name}
            </Row>
          ))}
        </ul>
        <form action={actions.addStyleDirection} className="flex gap-2 mt-3">
          <input name="name" placeholder="Name der Stilrichtung" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Größen">
        <ul className="flex flex-col gap-2">
          {(sizes ?? []).map((s) => (
            <Row key={s.id} onDelete={actions.deleteSize.bind(null, s.id)}>
              {s.category}: {s.size_label}
            </Row>
          ))}
        </ul>
        <form action={actions.addSize} className="flex gap-2 mt-3">
          <input name="category" placeholder="Kategorie (z.B. Oberteile)" className="input" />
          <input name="size_label" placeholder="Größe (z.B. M)" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section
        title="Passform-Referenzmaße"
        hint="Maße eines Kleidungsstücks, das dir bereits gut passt — die wichtigste Angabe im ganzen Profil"
      >
        <ul className="flex flex-col gap-2">
          {(fitRefs ?? []).map((f) => (
            <Row key={f.id} onDelete={actions.deleteFitReference.bind(null, f.id)}>
              {f.category}: Brust {f.chest_cm ?? "–"}cm, Länge {f.length_cm ?? "–"}cm,
              Schulter {f.shoulder_cm ?? "–"}cm (±{f.tolerance_cm}cm)
            </Row>
          ))}
        </ul>
        <form action={actions.upsertFitReference} className="grid grid-cols-4 gap-2 mt-3">
          <input name="category" placeholder="Kategorie" className="input" required />
          <select name="source" className="input">
            <option value="own_garment">eigenes Kleidungsstück</option>
            <option value="body_measurement">Körpermaß</option>
          </select>
          <input name="chest_cm" placeholder="Brust cm" className="input" />
          <input name="length_cm" placeholder="Länge cm" className="input" />
          <input name="shoulder_cm" placeholder="Schulter cm" className="input" />
          <input name="sleeve_cm" placeholder="Ärmel cm" className="input" />
          <input name="waist_cm" placeholder="Taille cm" className="input" />
          <input name="inseam_cm" placeholder="Schrittlänge cm" className="input" />
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
        <form action={actions.addExcludedCategory} className="flex gap-2 mt-3">
          <input name="category" placeholder="Kategorie" className="input" />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Stil-Keywords">
        <ul className="flex flex-col gap-2">
          {(keywords ?? []).map((k) => (
            <Row key={k.id} onDelete={actions.deleteStyleKeyword.bind(null, k.id)}>
              {k.keyword} · {directionName(k.style_direction_id)}
            </Row>
          ))}
        </ul>
        <form action={actions.addStyleKeyword} className="flex gap-2 mt-3 flex-wrap">
          <input name="keyword" placeholder="Keyword" className="input" required />
          <DirectionSelect directions={directions} />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Farben">
        <ul className="flex flex-col gap-2">
          {(colors ?? []).map((c) => (
            <Row key={c.id} onDelete={actions.deleteColor.bind(null, c.id)}>
              {c.color_name} · {c.preference} · {directionName(c.style_direction_id)}
            </Row>
          ))}
        </ul>
        <form action={actions.addColor} className="flex gap-2 mt-3 flex-wrap">
          <input name="color_name" placeholder="Farbe" className="input" required />
          <select name="preference" className="input">
            <option value="preferred">bevorzugt</option>
            <option value="excluded">ausgeschlossen</option>
          </select>
          <DirectionSelect directions={directions} />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Preisobergrenzen pro Kategorie">
        <ul className="flex flex-col gap-2">
          {(priceLimits ?? []).map((p) => (
            <Row key={p.id} onDelete={actions.deletePriceLimit.bind(null, p.id)}>
              {p.category}: max. {p.max_price_eur} €
            </Row>
          ))}
        </ul>
        <form action={actions.upsertPriceLimit} className="flex gap-2 mt-3">
          <input name="category" placeholder="Kategorie" className="input" required />
          <input name="max_price_eur" placeholder="Max. Preis €" className="input" required />
          <SubmitButton />
        </form>
      </Section>

      <Section title="Zielzustand" hint="z.B. gut bis sehr gut, nicht zwingend neu">
        <form action={actions.upsertConditionTarget} className="flex gap-2">
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

function SubmitButton() {
  return (
    <button
      type="submit"
      className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-sm h-fit self-start"
    >
      Hinzufügen
    </button>
  );
}
