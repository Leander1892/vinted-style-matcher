import "server-only";
import { supabase } from "@/lib/supabase";

// Single-profile v1 (Leander only). A second profile (girlfriend, Phase 8)
// is just another row later -- nothing here assumes there's only ever one.
export async function getOrCreateDefaultProfile() {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("display_name", "Leander")
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ display_name: "Leander" })
    .select("id, display_name")
    .single();

  if (error) throw new Error(error.message);
  return created;
}
