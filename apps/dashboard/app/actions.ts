"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function setScrapingEnabled(enabled: boolean) {
  const { error } = await supabase
    .from("app_settings")
    .update({ scraping_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}
