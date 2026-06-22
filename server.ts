import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: High-Fidelity Render Engine
  app.post("/api/render-html", async (req, res) => {
    const { html, format = 'png' } = req.body;

    if (!html) {
      return res.status(400).json({ error: "HTML content is required" });
    }

    let browser = null;
    try {
      // Configuration for high-fidelity rendering
      browser = await puppeteer.launch({
        args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: { 
          width: 600, 
          height: 800,
          deviceScaleFactor: 4 // Ultra-sharp text (High Res Logic)
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();

      // Apply the "High-Fidelity Prep Engine" logic directly in Puppeteer
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Inject cleanup and normalization scripts
      await page.evaluate(() => {
        // 1. Attribute Repair
        const imgs = document.querySelectorAll('img');
        imgs.forEach(img => {
          const len = img.getAttribute('length');
          if (len) {
            img.setAttribute('height', len);
            img.removeAttribute('length');
          }
          if (img.getAttribute('width') && !img.getAttribute('height')) {
            img.style.height = 'auto';
          }
          img.style.display = 'block';
        });

        // 2. Table Normalization
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          table.style.borderCollapse = 'collapse';
          table.style.borderSpacing = '0';
        });

        // 3. Master Styles
        const style = document.createElement('style');
        style.textContent = `
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 600px !important;
            background-color: white !important;
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
            overflow: hidden !important;
          }
          * { max-width: 600px !important; box-sizing: border-box !important; }
        `;
        document.head.appendChild(style);
      });

      // Wait a bit for layout to settle
      await new Promise(r => setTimeout(r, 500));

      // Capture the full content
      const buffer = await page.screenshot({
        fullPage: true,
        type: format === 'jpeg' ? 'jpeg' : 'png',
        quality: format === 'jpeg' ? 95 : undefined,
      });

      res.set('Content-Type', `image/${format}`);
      res.send(buffer);

    } catch (error: any) {
      console.error("Render Error:", error);
      res.status(500).json({ error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
