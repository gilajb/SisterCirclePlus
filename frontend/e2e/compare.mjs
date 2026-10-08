// Builds side-by-side images of two screenshot runs for visual review:
//   node e2e/compare.mjs baseline next [name-filter]
// Output: e2e/__screens__/compare/<route>-<viewport>.png (left = first label).
import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [a = "baseline", b = "next", filter = ""] = process.argv.slice(2);
const root = path.resolve("e2e/__screens__");
const out = path.join(root, "compare");
mkdirSync(out, { recursive: true });

const names = readdirSync(path.join(root, b)).filter(
  (f) => f.endsWith(".png") && new RegExp(filter).test(f),
);
const dataUri = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
for (const name of names) {
  const left = path.join(root, a, name);
  if (!existsSync(left)) continue;
  await page.setContent(`
    <body style="margin:0;background:#333;font:14px system-ui;color:#fff">
      <div style="display:flex;gap:8px;align-items:flex-start;padding:8px">
        <figure style="margin:0;flex:1"><figcaption>${a}</figcaption><img style="width:100%" src="${dataUri(left)}"></figure>
        <figure style="margin:0;flex:1"><figcaption>${b}</figcaption><img style="width:100%" src="${dataUri(path.join(root, b, name))}"></figure>
      </div>
    </body>`);
  await page.screenshot({ path: path.join(out, name), fullPage: true });
}
await browser.close();
console.log(`${names.length} comparisons written to ${out}`);
