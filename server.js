const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize a browser pool
const browserPool = {
  browsers: [],
  maxInstances: 5,
  async init() {
    for (let i = 0; i < this.maxInstances; i++) {
      const browser = await chromium.launch();
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
  console.log('Browser pool initialized');
});

app.get('/check-h1', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  let browser;
  try {
    browser = await browserPool.getBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const h1Text = await page.$eval('h1', el => el.textContent);

    await page.close();
    browserPool.releaseBrowser(browser);

    res.json({ h1Text });
  } catch (error) {
    if (browser) {
      browserPool.releaseBrowser(browser);
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to extract h1 text' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
