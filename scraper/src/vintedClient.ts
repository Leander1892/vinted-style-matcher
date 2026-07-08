import type { Browser } from "playwright";

export type RawListing = {
  vintedItemId: number;
  url: string;
  priceEur: number | null;
  rawText: string;
};

const BASE_URL = "https://www.vinted.de/catalog";

// Best-effort extraction: Vinted's exact DOM structure/class names aren't
// reverse-engineered here, so only the item link (reliable, proven by the
// Phase 0 spike) and a naive price regex from the surrounding card text are
// extracted. Title/brand/size/photo are left for a later pass once we've
// seen real search results and can refine selectors against them.
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

  const url = new URL(BASE_URL);
  if (searchText) url.searchParams.set("search_text", searchText);
  if (priceTo) url.searchParams.set("price_to", String(priceTo));
  url.searchParams.set("order", "newest_first");

  await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2000);

  const items = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/items/"]'));
    const seen = new Set<string>();
    const results: { url: string; text: string }[] = [];
    for (const a of anchors) {
      const href = (a as HTMLAnchorElement).href;
      if (seen.has(href)) continue;
      seen.add(href);
      let node: Element | null = a;
      for (let i = 0; i < 4 && node?.parentElement; i++) node = node.parentElement;
      results.push({
        url: href,
        text: node?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      });
    }
    return results;
  });

  await context.close();

  return items
    .map(({ url: itemUrl, text }) => {
      const idMatch = itemUrl.match(/\/items\/(\d+)/);
      const priceMatch = text.match(/(\d+[.,]\d{2})\s?€/);
      return {
        vintedItemId: idMatch ? Number(idMatch[1]) : 0,
        url: itemUrl,
        priceEur: priceMatch ? Number(priceMatch[1].replace(",", ".")) : null,
        rawText: text,
      };
    })
    .filter((item) => item.vintedItemId > 0);
}
