const express = require("express");
const path = require("path");
const { getBedwarsLevel } = require("./bedwars-fetch");

const app = express();
const PORT = 3000;

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Server-side cache
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

// API endpoint to get player level
app.get("/api/player/:username", async (req, res) => {
  const { username } = req.params;
  const now = Date.now();

  // Return cached value if still valid
  if (cache.has(username)) {
    const { level, timestamp } = cache.get(username);
    if (now - timestamp < CACHE_TTL) {
      return res.json({ level });
    }
  }

  try {
    const level = await getBedwarsLevel(username);

    if (level !== null) {
      cache.set(username, { level, timestamp: now });
      res.json({ level });
    } else {
      res.json({ level: null, message: "Level not found yet, try again" });
    }
  } catch (err) {
    console.error(`❌ Error fetching level for ${username}:`, err.message);
    res.status(500).json({ level: null, message: "Server error" });
  }
});

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server accessible on local network
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://0.0.0.0:${PORT}`);
});
