import { appendFileSync } from "node:fs";
import { chromium } from "playwright";

const TARGET_URL = "https://www.vinted.de/catalog";
const LOG_FILE = new URL("../spike-log.jsonl", import.meta.url);

type SpikeResult = {
  timestamp: string;
  httpStatus: number | null;
  blocked: boolean;
  itemLinksFound: number;
  note: string;
};

async function runSpike(): Promise<SpikeResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "de-DE",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  let httpStatus: number | null = null;
  let note = "ok";

  try {
    const response = await page.goto(TARGET_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    httpStatus = response?.status() ?? null;
    await page.waitForTimeout(2000);
  } catch (err) {
    note = `navigation error: ${(err as Error).message}`;
  }

  const title = await page.title().catch(() => "");
  const itemLinksFound = await page
    .locator('a[href*="/items/"]')
    .count()
    .catch(() => 0);

  // DataDome challenge pages typically swap in a captcha/interstitial title
  // instead of the normal catalog title, even on a 200 response.
  const looksChallenged =
    /just a moment|access denied|verify you are human|datadome/i.test(title);
  const blocked =
    httpStatus === 403 || httpStatus === 429 || looksChallenged || itemLinksFound === 0;

  if (blocked && note === "ok") {
    note = `suspected block (title: "${title}")`;
  }

  await browser.close();

  return {
    timestamp: new Date().toISOString(),
    httpStatus,
    blocked,
    itemLinksFound,
    note,
  };
}

const result = await runSpike();
console.log(JSON.stringify(result));
appendFileSync(LOG_FILE, JSON.stringify(result) + "\n");

if (result.blocked) {
  process.exitCode = 1;
}
