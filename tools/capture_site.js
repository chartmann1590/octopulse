let chromium;
try { chromium = require('playwright').chromium; } catch {}
if (!chromium) {
  try { chromium = require('C:\\Users\\Charles\\AppData\\Roaming\\npm\\node_modules\\@playwright\\test\\node_modules\\playwright').chromium; } catch {}
}
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const fileUrl = 'file:///' + path.join(__dirname, '..', 'docs', 'index.html').replace(/\\/g, '/');
  console.log('Loading', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Scroll to promo video section and screenshot
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tools/site-preview.png', fullPage: true });
  console.log('Saved tools/site-preview.png');
  // Also screenshot just video section
  const promo = await page.locator('#promo');
  if (await promo.count()) {
    await promo.screenshot({ path: 'tools/promo-section.png' });
    console.log('Saved promo-section.png');
  }
  const shots = await page.locator('#screenshots');
  if (await shots.count()) {
    await shots.screenshot({ path: 'tools/screenshots-section.png' });
    console.log('Saved screenshots-section.png');
  }
  await browser.close();
})();
