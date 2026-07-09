import type { Browser } from "playwright";

export type RawListing = {
  vintedItemId: number;
  url: string;
  title: string | null;
  brandName: string | null;
  sizeLabel: string | null;
  statusLabel: string | null;
  priceEur: number | null;
  photoUrl: string | null;
  sellerId: number | null;
  sellerRating: number | null;
  sellerReviewsCount: number | null;
  rawPayload: unknown;
};

const BASE_URL = "https://www.vinted.de/catalog";

function pick<T>(...values: (T | undefined | null)[]): T | null {
  for (const v of values) if (v !== undefined && v !== null) return v;
  return null;
}

// Preferred path: read the JSON Vinted's own frontend loads to render the
// page (richer + far more precise than scraping visible text), captured by
// eavesdropping on the browser's real network responses. Field names below
// are a best guess from public reverse-engineering write-ups, unverified
// against a live response -- hence the fallbacks and the full raw item
// kept alongside every listing for correction after the first real run.
export async function searchListings(
  browser: Browser,
  searchText: string,
  priceTo: number | null
): Promise<RawListing[]> {
  const context = await browser.newContext({
    locale: "de-DE",
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const capturedItems: Record<string, any>[] = [];

  page.on("response", async (response) => {
    if (!/\/api\/v2\/catalog\/items/.test(response.url())) return;
    try {
      const json = await response.json();
      const items = json?.items ?? json?.data ?? [];
      if (Array.isArray(items)) capturedItems.push(...items);
    } catch {
      // Non-JSON or empty body -- ignore, fall back to DOM scrape below.
    }
  });

  const url = new URL(BASE_URL);
  if (searchText) url.searchParams.set("search_text", searchText);
  if (priceTo) url.searchParams.set("price_to", String(priceTo));
  url.searchParams.set("order", "newest_first");

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  let results: RawListing[];

  if (capturedItems.length > 0) {
    results = capturedItems.map((item) => ({
      vintedItemId: Number(item.id) || 0,
      url: item.url ? String(item.url) : `https://www.vinted.de/items/${item.id}`,
      title: pick(item.title),
      brandName: pick(item.brand_title, item.brand?.title),
      sizeLabel: pick(item.size_title, item.size?.title),
      statusLabel: pick(item.status, item.condition?.title),
      priceEur: pick(
        item.price?.amount != null ? Number(item.price.amount) : undefined,
        item.total_item_price?.amount != null ? Number(item.total_item_price.amount) : undefined,
        typeof item.price === "string" ? Number(item.price) : undefined
      ),
      photoUrl: pick(item.photo?.url, item.photos?.[0]?.url),
      sellerId: pick(item.user?.id != null ? Number(item.user.id) : undefined),
      sellerRating: pick(
        item.user?.feedback_reputation != null ? Number(item.user.feedback_reputation) : undefined
      ),
      sellerReviewsCount: pick(
        item.user?.positive_feedback_count != null
          ? Number(item.user.positive_feedback_count)
          : undefined
      ),
      rawPayload: item,
    }));
  } else {
    // No matching API response captured -- degrade to the proven DOM-link
    // extraction so we at least get IDs/URLs instead of nothing.
    const domItems = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/items/"]'));
      const seen = new Set<string>();
      const out: { url: string; text: string }[] = [];
      for (const a of anchors) {
        const href = (a as HTMLAnchorElement).href;
        if (seen.has(href)) continue;
        seen.add(href);
        let node: Element | null = a;
        for (let i = 0; i < 4 && node?.parentElement; i++) node = node.parentElement;
        out.push({ url: href, text: node?.textContent?.replace(/\s+/g, " ").trim() ?? "" });
      }
      return out;
    });

    results = domItems
      .map(({ url: itemUrl, text }) => {
        const idMatch = itemUrl.match(/\/items\/(\d+)/);
        const priceMatch = text.match(/(\d+[.,]\d{2})\s?€/);
        return {
          vintedItemId: idMatch ? Number(idMatch[1]) : 0,
          url: itemUrl,
          title: null,
          brandName: null,
          sizeLabel: null,
          statusLabel: null,
          priceEur: priceMatch ? Number(priceMatch[1].replace(",", ".")) : null,
          photoUrl: null,
          sellerId: null,
          sellerRating: null,
          sellerReviewsCount: null,
          rawPayload: { fallback: "dom-scrape", text },
        };
      })
      .filter((item) => item.vintedItemId > 0);
  }

  await context.close();
  return results;
}
