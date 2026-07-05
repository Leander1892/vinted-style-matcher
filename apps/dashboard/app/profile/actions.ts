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

async function revalidate() {
  revalidatePath("/profile");
}

export async function addStyleDirection(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const name = str(formData, "name");
  if (!name) return;
  await supabase.from("style_directions").insert({ profile_id: profile.id, name });
  await revalidate();
}

export async function deleteStyleDirection(id: string) {
  await supabase.from("style_directions").delete().eq("id", id);
  await revalidate();
}

export async function addSize(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const category = str(formData, "category");
  const size_label = str(formData, "size_label");
  if (!category || !size_label) return;
  await supabase.from("profile_sizes").insert({ profile_id: profile.id, category, size_label });
  await revalidate();
}

export async function deleteSize(id: string) {
  await supabase.from("profile_sizes").delete().eq("id", id);
  await revalidate();
}

export async function upsertFitReference(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const category = str(formData, "category");
  if (!category) return;
  await supabase.from("profile_fit_references").upsert(
    {
      profile_id: profile.id,
      category,
      source: str(formData, "source") ?? "own_garment",
      chest_cm: num(formData, "chest_cm"),
      length_cm: num(formData, "length_cm"),
      shoulder_cm: num(formData, "shoulder_cm"),
      sleeve_cm: num(formData, "sleeve_cm"),
      waist_cm: num(formData, "waist_cm"),
      inseam_cm: num(formData, "inseam_cm"),
      tolerance_cm: num(formData, "tolerance_cm") ?? 3.0,
      notes: str(formData, "notes"),
    },
    { onConflict: "profile_id,category" }
  );
  await revalidate();
}

export async function deleteFitReference(id: string) {
  await supabase.from("profile_fit_references").delete().eq("id", id);
  await revalidate();
}

export async function addBrand(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const brand_name = str(formData, "brand_name");
  if (!brand_name) return;
  await supabase.from("profile_brands").insert({
    profile_id: profile.id,
    style_direction_id: str(formData, "style_direction_id"),
    brand_name,
    preference: str(formData, "preference") ?? "preferred",
    weight: num(formData, "weight") ?? 1,
  });
  await revalidate();
}

export async function deleteBrand(id: string) {
  await supabase.from("profile_brands").delete().eq("id", id);
  await revalidate();
}

export async function addExcludedCategory(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const category = str(formData, "category");
  if (!category) return;
  await supabase.from("profile_excluded_categories").insert({ profile_id: profile.id, category });
  await revalidate();
}

export async function deleteExcludedCategory(id: string) {
  await supabase.from("profile_excluded_categories").delete().eq("id", id);
  await revalidate();
}

export async function addStyleKeyword(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const keyword = str(formData, "keyword");
  if (!keyword) return;
  await supabase.from("profile_style_keywords").insert({
    profile_id: profile.id,
    style_direction_id: str(formData, "style_direction_id"),
    keyword,
    weight: num(formData, "weight") ?? 1,
  });
  await revalidate();
}

export async function deleteStyleKeyword(id: string) {
  await supabase.from("profile_style_keywords").delete().eq("id", id);
  await revalidate();
}

export async function addColor(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const color_name = str(formData, "color_name");
  if (!color_name) return;
  await supabase.from("profile_colors").insert({
    profile_id: profile.id,
    style_direction_id: str(formData, "style_direction_id"),
    color_name,
    preference: str(formData, "preference") ?? "preferred",
  });
  await revalidate();
}

export async function deleteColor(id: string) {
  await supabase.from("profile_colors").delete().eq("id", id);
  await revalidate();
}

export async function upsertPriceLimit(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const category = str(formData, "category");
  const max_price_eur = num(formData, "max_price_eur");
  if (!category || max_price_eur === null) return;
  await supabase
    .from("profile_price_limits")
    .upsert(
      { profile_id: profile.id, category, max_price_eur },
      { onConflict: "profile_id,category" }
    );
  await revalidate();
}

export async function deletePriceLimit(id: string) {
  await supabase.from("profile_price_limits").delete().eq("id", id);
  await revalidate();
}

export async function upsertConditionTarget(formData: FormData) {
  const profile = await getOrCreateDefaultProfile();
  const min_condition = str(formData, "min_condition");
  const max_condition = str(formData, "max_condition");
  if (!min_condition || !max_condition) return;
  await supabase
    .from("profile_condition_target")
    .upsert(
      { profile_id: profile.id, min_condition, max_condition },
      { onConflict: "profile_id" }
    );
  await revalidate();
}
