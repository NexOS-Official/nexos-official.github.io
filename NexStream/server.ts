import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { loadData, downloadData, data } from "./api";
import { DATA_DIR } from "./constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  
  try {
    console.log("Loading IPTV data...");
    await loadData();
    console.log("IPTV data loaded.");
  } catch (error) {
    console.log("No IPTV data found on disk. Downloading...");
    await downloadData();
    await loadData();
    console.log("IPTV data downloaded and loaded.");
  }

  app.get("/api/channels", (req, res) => {
    try {
      const channels = Object.values(data.channelsKeyById.data()).map(channel => {
        const feeds = data.feedsGroupedByChannel.get(channel.id) || [];
        
        // Handle categories and countries which might be Collections or Arrays
        const categories = Array.isArray(channel.categories) ? channel.categories : (channel.categories?.all?.() || []);
        const countries = Array.isArray(channel.countries) ? channel.countries : (channel.countries?.all?.() || []);
        
        const category = categories[0] || 'General';
        
        return {
          id: channel.id,
          code: channel.id.split('.')?.[0]?.toUpperCase() || 'CH',
          name: channel.name,
          category: category,
          thumbnail: channel.logo || 'https://picsum.photos/seed/iptv/400/225',
          description: `Live stream from ${countries[0] || 'Global'}.`,
          servers: feeds.map((feed, idx) => ({
            name: `Server ${idx + 1}`,
            url: feed.url
          }))
        };
      });

      console.log(`Serving ${Math.min(channels.length, 100)} channels out of ${channels.length}`);
      res.json(channels.slice(0, 100)); 
    } catch (error) {
      console.error("Error processing channels:", error);
      res.status(500).json({ error: "Failed to process channels" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: "src"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NexStream Server running on http://localhost:${PORT}`);
  });
}

startServer();
