const fetch = require("node-fetch");
const cheerio = require("cheerio");

const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function getBedwarsLevel(username) {
  const now = Date.now();

  // Return cached value if still fresh
  if (cache.has(username)) {
    const { level, timestamp } = cache.get(username);
    if (now - timestamp < CACHE_TTL) return level;
  }

  try {
    const url = `https://25karma.xyz/player/${encodeURIComponent(username)}`;
    const res = await fetch(url, { timeout: 15000 });
    const html = await res.text();

    const $ = cheerio.load(html);

    // Your existing selector
    const text = $(
      "#root > div.pagelayout.pb-4.px-1 > div.pagelayout-body.px-1 > div:nth-child(2) > section:nth-child(4) > div > div.lazyload-wrapper > div > div.overflow-x > div > div > div.mb-3 > div.h-flex > span:nth-child(1)"
    ).text();

    const level = text.replace(/\D/g, "") || null;

    if (level) cache.set(username, { level, timestamp: now });

    return level;
  } catch (err) {
    console.error(`❌ Error fetching BedWars level for ${username}:`, err.message);
    return null;
  }
}

// No browser to close, so we can skip closeBrowser
module.exports = { getBedwarsLevel };
