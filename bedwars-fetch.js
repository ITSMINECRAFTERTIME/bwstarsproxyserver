const puppeteer = require("puppeteer");

let browser;
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Launch Chrome (non-headless, only once)
async function launchBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false, // 👈 Chrome window visible
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("🌐 Puppeteer launched (Chrome visible)");
  }
}

async function getBedwarsLevel(username) {
  const now = Date.now();

  // Return cached value if still fresh
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

    // ✅ Use your provided selector
    const selector =
      "#root > div.pagelayout.pb-4.px-1 > div.pagelayout-body.px-1 > div:nth-child(2) > section:nth-child(4) > div > div.lazyload-wrapper > div > div.overflow-x > div > div > div.mb-3 > div.h-flex > span:nth-child(1)";
    await page.waitForSelector(selector, { timeout: 15000 });

    // ✅ Extract full text, strip to digits only
    level = await page.$eval(selector, el => {
      return el.textContent.replace(/\D/g, "") || null;
    });

    await page.close(); // ✅ close tab (not browser)

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
    await browser.close();
    browser = null;
    console.log("🛑 Puppeteer closed");
  }
}

process.on("exit", closeBrowser);
process.on("SIGINT", closeBrowser);
process.on("SIGTERM", closeBrowser);

module.exports = { getBedwarsLevel, closeBrowser };
