const puppeteer = require("puppeteer");

let browser;
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: 1280, height: 800 },
    });
    console.log("🌐 Puppeteer launched (headless new)");
  }
  return browser;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getBedwarsLevel(username) {
  const now = Date.now();
  if (cache.has(username)) {
    const { level, timestamp } = cache.get(username);
    if (now - timestamp < CACHE_TTL) return level;
  }

  const browserInstance = await launchBrowser();
  const page = await browserInstance.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    await page.goto(
      `https://25karma.xyz/player/${encodeURIComponent(username)}`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );

    const containerSelector = "#root div.pagelayout-body";
    await page.waitForSelector(containerSelector, { timeout: 15000 });
    await page.evaluate(() => {
      const el = document.querySelector("#root div.pagelayout-body");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await delay(1000);

    const levelSelector =
      "#root > div.pagelayout.pb-4.px-1 > div.pagelayout-body.px-1 > div:nth-child(2) > section:nth-child(4) > div > div.lazyload-wrapper > div > div.overflow-x > div > div > div.mb-3 > div.h-flex > span:nth-child(1)";

    let level = null;
    let isNicked = false;

    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      try {
        level = await page.$eval(
          levelSelector,
          el => el.textContent.replace(/\D/g, "") || null
        );
        if (level) break;
      } catch {
        // If the level span doesn't exist, check for a "nicked" indicator
        const nickedText = await page.evaluate(() => {
          const el = document.querySelector("div.player-nicked, div.nicked");
          return el ? el.textContent : null;
        });
        if (nickedText) {
          isNicked = true;
          break;
        }
        await delay(1000);
      }
    }

    await page.close();

    const result = isNicked ? "nicked" : level || null;
    if (result) cache.set(username, { level: result, timestamp: now });
    return result;

  } catch (err) {
    console.error(`❌ Error fetching BedWars level for ${username}:`, err.message);
    await page.close();
    return null;
  }
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    console.log("🛑 Puppeteer closed");
  }
}

process.on("exit", closeBrowser);
process.on("SIGINT", closeBrowser);
process.on("SIGTERM", closeBrowser);

module.exports = { launchBrowser, getBedwarsLevel, closeBrowser };
