"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getOrCreateDefaultProfile } from "@/lib/profile";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}
function num(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === null ? null : Number(v);
}

export async function addSearchConfig(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const name = str(formData, "name");
  if (!name) return;

  await supabase.from("search_configs").insert({
    profile_id: profile.id,
    name,
    search_text: str(formData, "search_text"),
    price_to: num(formData, "price_to"),
    poll_interval_minutes: num(formData, "poll_interval_minutes") ?? 20,
    is_active: true,
  });

  revalidatePath("/search-configs");
}

export async function toggleSearchConfig(id: string, isActive: boolean) {
  await supabase.from("search_configs").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/search-configs");
}

export async function deleteSearchConfig(id: string) {
  await supabase.from("search_configs").delete().eq("id", id);
  revalidatePath("/search-configs");
}
