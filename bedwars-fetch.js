const puppeteer = require("puppeteer-core");

let browser;
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Path to Chrome on Android (Termux)
// You must have Chrome installed + enable "Remote debugging via port"
const CHROME_PATH = "/data/data/com.android.chrome/app_chrome/Default"; 

// Launch Chrome (connect to remote if on Android)
async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.connect({
      browserURL: "http://localhost:9222", // 👈 connect to Chrome DevTools
      defaultViewport: null,
    });
    console.log("🌐 Connected to Chrome on Android");
  }
}

async function getBedwarsLevel(username) {
  const now = Date.now();

  // ✅ Return cached value if still fresh
  if (cache.has(username)) {
    const { level, timestamp } = cache.get(username);
    if (now - timestamp < CACHE_TTL) {
      return level;
    }
  }

  let level = null;

  try {
    await launchBrowser(); // ensure browser is running
    const page = await browser.newPage();

    await page.goto(
      `https://25karma.xyz/player/${encodeURIComponent(username)}`,
      { waitUntil: "domcontentloaded", timeout: 30000 }
    );

    // ✅ Selector you gave
    const selector =
      "#root > div.pagelayout.pb-4.px-1 > div.pagelayout-body.px-1 > div:nth-child(2) > section:nth-child(4) > div > div.lazyload-wrapper > div > div.overflow-x > div > div > div.mb-3 > div.h-flex > span:nth-child(1)";
    await page.waitForSelector(selector, { timeout: 15000 });

    level = await page.$eval(selector, el =>
      el.textContent.replace(/\D/g, "") || null
    );

    await page.close();

    if (level) {
      cache.set(username, { level, timestamp: now });
    }

    return level || null;
  } catch (err) {
    console.error(`❌ Error fetching BedWars level for ${username}:`, err.message);
    return null;
  }
}

// Clean browser shutdown
async function closeBrowser() {
  if (browser) {
    try {
      await browser.disconnect(); // disconnect from Chrome Dev
      console.log("🛑 Disconnected from Chrome on Android");
    } catch (err) {
      console.warn("⚠️ Error disconnecting:", err.message);
    }
    browser = null;
  }
}

process.on("exit", closeBrowser);
process.on("SIGINT", closeBrowser);
process.on("SIGTERM", closeBrowser);

module.exports = { getBedwarsLevel, closeBrowser };
