import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { searchListings } from "./vintedClient.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logRun(fields: {
  startedAt: string;
  searchConfigsProcessed: number;
  listingsFound: number;
  errorsCount: number;
  wasBlocked: boolean;
  notes: string;
}) {
  await supabase.from("scraper_runs").insert({
    started_at: fields.startedAt,
    finished_at: new Date().toISOString(),
    search_configs_processed: fields.searchConfigsProcessed,
    listings_found: fields.listingsFound,
    errors_count: fields.errorsCount,
    was_blocked: fields.wasBlocked,
    notes: fields.notes,
  });
}

async function main() {
  const startedAt = new Date().toISOString();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("scraping_enabled")
    .eq("id", 1)
    .single();

  if (!settings?.scraping_enabled) {
    console.log("Scraping paused (scraping_enabled=false). No requests made.");
    await logRun({
      startedAt,
      searchConfigsProcessed: 0,
      listingsFound: 0,
      errorsCount: 0,
      wasBlocked: false,
      notes: "paused",
    });
    return;
  }

  const { data: configs } = await supabase
    .from("search_configs")
    .select("id, search_text, price_to")
    .eq("is_active", true);

  let listingsFound = 0;
  let errorsCount = 0;
  let wasBlocked = false;

  const browser = await chromium.launch({ headless: true });

  for (const config of configs ?? []) {
    try {
      const items = await searchListings(browser, config.search_text ?? "", config.price_to);

      for (const item of items) {
        const { error } = await supabase.from("listings").upsert(
          {
            vinted_item_id: item.vintedItemId,
            title: item.title,
            brand_name: item.brandName,
            size_label: item.sizeLabel,
            status_label: item.statusLabel,
            price_eur: item.priceEur,
            url: item.url,
            photo_url: item.photoUrl,
            seller_id: item.sellerId,
            seller_rating: item.sellerRating,
            seller_reviews_count: item.sellerReviewsCount,
            last_seen_at: new Date().toISOString(),
            raw_payload: item.rawPayload,
          },
          { onConflict: "vinted_item_id" }
        );
        if (!error) listingsFound++;
        else errorsCount++;
      }

      await supabase
        .from("search_configs")
        .update({ last_polled_at: new Date().toISOString() })
        .eq("id", config.id);
    } catch (err) {
      errorsCount++;
      if (/403|429|timeout/i.test(String(err))) wasBlocked = true;
      console.error(`Search config ${config.id} failed:`, err);
    }
  }

  await browser.close();

  await logRun({
    startedAt,
    searchConfigsProcessed: (configs ?? []).length,
    listingsFound,
    errorsCount,
    wasBlocked,
    notes: wasBlocked ? "possible block detected" : "ok",
  });
}

main();
