// Erzeugt die OpenGraph-Bilder (1200×630) für DE und EN: `node scripts/gen-og.mjs`
// Optional: CHROMIUM_PATH=/pfad/zu/chrome
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const font = readFileSync(new URL("../public/fonts/inter-latin-wght-normal.woff2", import.meta.url)).toString("base64");
const contours = readFileSync(new URL("../public/brand/contours.svg", import.meta.url)).toString("base64");

const texts = {
  de: { title: "Testzentrum für Drohnen und Robotik", sub: "Eibenstein · Niederösterreich", claim: "Heute testen. Morgen sichern." },
  en: { title: "Test centre for drones and robotics", sub: "Eibenstein · Lower Austria", claim: "Test today. Secure tomorrow." },
};

const html = (t) => `<!doctype html><html><head><style>
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #fff;
  background: #0c0f13 url(data:image/svg+xml;base64,${contours}) center/1500px auto; display: flex; flex-direction: column; justify-content: space-between; padding: 72px 80px; }
.logo { display: flex; gap: 18px; align-items: stretch; }
.bar { width: 8px; background: #c8102e; }
.mark { font-weight: 800; font-size: 64px; line-height: 1; letter-spacing: 1px; }
.mark span { color: #c8102e; }
.sub1 { font-size: 20px; color: #d6d3cc; margin-top: 10px; font-weight: 500; }
.sub2 { font-size: 15px; color: #9aa0a8; margin-top: 6px; letter-spacing: .5px; }
h1 { font-size: 60px; line-height: 1.08; font-weight: 750; letter-spacing: -1px; max-width: 900px; }
.meta { margin-top: 18px; font-size: 26px; color: #c9ccd1; }
.claim { margin-top: 10px; font-size: 26px; font-weight: 650; color: #fff; }
</style></head><body>
<div class="logo"><div class="bar"></div><div><div class="mark">DIH<span>A</span></div><div class="sub1">Drone Innovation Hub Austria</div><div class="sub2">a company by AEEG</div></div></div>
<div><h1>${t.title}</h1><div class="meta">${t.sub}</div><div class="claim">${t.claim}</div></div>
</body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [locale, t] of Object.entries(texts)) {
  await page.setContent(html(t));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `public/og/diha-og-${locale}.png` });
  console.log("og", locale);
}
await browser.close();
