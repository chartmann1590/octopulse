let chromium;
try { chromium = require('playwright').chromium; } catch {}
if (!chromium) {
  try { chromium = require('C:\\Users\\Charles\\AppData\\Roaming\\npm\\node_modules\\@playwright\\test\\node_modules\\playwright').chromium; } catch {}
}
if (!chromium) {
  try { chromium = require('playwright-core').chromium; } catch {}
}
if (!chromium) { console.error('playwright not found'); process.exit(1); }
const path = require('path');
const fs = require('fs');

async function capture() {
  const htmlDir = path.join(__dirname, 'screenshots_html');
  const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const files = [
    { html: '01-dashboard.html', png: '01-dashboard.png' },
    { html: '02-discover.html', png: '02-discover.png' },
    { html: '03-pairing.html', png: '03-pairing.png' },
    { html: '04-detail.html', png: '04-detail.png' },
    { html: '05-control.html', png: '05-control.png' },
    { html: '06-gcode.html', png: '06-gcode.png' },
  ];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 2340 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  for (const f of files) {
    const htmlPath = path.join(htmlDir, f.html);
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    console.log(`→ Loading ${f.html} -> ${fileUrl}`);
    await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    // wait for fonts
    await page.waitForTimeout(1200);
    // ensure body loaded
    await page.evaluate(() => document.fonts && document.fonts.ready);

    const outPath = path.join(outDir, f.png);
    await page.screenshot({
      path: outPath,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1080, height: 2340 },
      type: 'png',
    });
    const stat = fs.statSync(outPath);
    console.log(`✓ Saved ${f.png} — ${(stat.size/1024).toFixed(1)} KB`);
  }

  await browser.close();
  console.log('All screenshots captured to docs/screenshots/');
}

capture().catch(e => { console.error(e); process.exit(1); });
