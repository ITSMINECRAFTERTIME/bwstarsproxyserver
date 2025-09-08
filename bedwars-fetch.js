const puppeteer = require("puppeteer");

let browser;
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Path to Chromium installed via Termux
const CHROMIUM_PATH = "/data/data/com.termux/files/usr/bin/chromium";

async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true, // run headless for Termux
      executablePath: CHROMIUM_PATH,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("🌐 Puppeteer launched (Termux Chromium)");
  }
}

async function getBedwarsLevel(username) {
  const now = Date.now();

  // Return cached value if still fresh
  if (cache.has(username)) {
    const { level, timestamp } = cache.get(username);
    if (now - timestamp < CACHE_TTL) return level;
  }

  let level = null;

  try {
    await launchBrowser();
    const page = await browser.newPage();

    await page.goto(
      `https://25karma.xyz/player/${encodeURIComponent(username)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    const selector =
      "#root > div.pagelayout.pb-4.px-1 > div.pagelayout-body.px-1 > div:nth-child(2) > section:nth-child(4) > div > div.lazyload-wrapper > div > div.overflow-x > div > div > div.mb-3 > div.h-flex > span:nth-child(1)";
    await page.waitForSelector(selector, { timeout: 15000 });

    level = await page.$eval(selector, el => el.textContent.replace(/\D/g, "") || null);

    await page.close();

    if (level) cache.set(username, { level, timestamp: now });

    return level || null;
  } catch (err) {
    console.error(`❌ Error fetching BedWars level for ${username}:`, err.message);
    return null;
  }
}

async function closeBrowser() {
  if (browser) {
    try {
      await browser.close();
      console.log("🛑 Puppeteer closed");
    } catch (err) {
      console.warn("⚠️ Error closing Puppeteer:", err.message);
    }
    browser = null;
  }
}

process.on("exit", closeBrowser);
process.on("SIGINT", closeBrowser);
process.on("SIGTERM", closeBrowser);

module.exports = { getBedwarsLevel, closeBrowser };
