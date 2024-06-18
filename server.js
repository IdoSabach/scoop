const express = require("express");
const { chromium } = require("playwright");
const app = express();
const PORT = process.env.PORT || 3000;
const path = require("path");
const fs = require("fs");
if (!fs.existsSync("screenshots")) fs.mkdirSync("screenshots");

// Initialize a browser pool
const browserPool = {
  browsers: [],
  maxInstances: 5,
  async init() {
    for (let i = 0; i < this.maxInstances; i++) {
      const browser = await chromium.launch({ headless: true });
      this.browsers.push(browser);
    }
  },
  async getBrowser() {
    if (this.browsers.length === 0) {
      return await chromium.launch();
    } else {
      return this.browsers.pop();
    }
  },
  async releaseBrowser(browser) {
    this.browsers.push(browser);
  },
};

// Initialize the browser pool before the server starts
browserPool.init().then(() => {
  console.log("Browser pool initialized");
});

app.get("/screenshot", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL query parameter is required" });
  }

  let browser;
  try {
    browser = await browserPool.getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.pause();
    await page.screenshot({
      path: path.join(process.cwd(), "screenshots", `${Date.now()}.png`),
      fullPage: true,
    });

    await page.close();
    browserPool.releaseBrowser(browser);

    res.json({ message: `Screenshot taken of ${url} ` });
  } catch (error) {
    if (browser) {
      browserPool.releaseBrowser(browser);
    }
    console.error(error);
    res.status(500).json({ error: "Failed to take screenshot" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
