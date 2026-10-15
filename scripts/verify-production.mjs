import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const url = process.argv[2] || "http://127.0.0.1:4173/";
const browser = await chromium.launch({
  executablePath: process.env.CI
    ? undefined
    : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage(),
  errors = [],
  failed = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
});
page.on("requestfailed", (r) =>
  console.error("requestfailed", r.url(), r.failure()),
);
page.on("console", (m) => {
  if (m.type() === "error") console.error("browser", m.text());
});
try {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  if (response.status() !== 200) throw Error(`HTTP ${response.status()}`);
  await page.getByRole("button", { name: "明白了，回到基地" }).click();
  await page.getByRole("heading", { name: "欢迎回到暖窝。" }).waitFor();
  if (await page.evaluate(() => typeof window.__game !== "undefined"))
    throw Error("Production exposed development helpers");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/production-home.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "战区地图" }).click();
  await page.getByRole("button", { name: "开始行动" }).click();
  await page.locator("#raid-time").waitFor();
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyD");
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const deltas = [];
        let prev = performance.now();
        function step(now) {
          deltas.push(now - prev);
          prev = now;
          if (deltas.length < 90) requestAnimationFrame(step);
          else resolve(deltas.slice(5));
        }
        requestAnimationFrame(step);
      }),
  );
  const fps = 1000 / (frames.reduce((n, t) => n + t, 0) / frames.length);
  await page.keyboard.press("Escape");
  await page.getByRole("heading", { name: "行动暂停" }).waitFor();
  await page.getByRole("button", { name: "放弃行动并按死亡结算" }).click();
  await page.getByRole("button", { name: "返回暖窝" }).click();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "欢迎回到暖窝。" }).waitFor();
  await page.getByRole("button", { name: "仓库与整备" }).first().click();
  await page.getByRole("heading", { name: "仓库与整备" }).waitFor();
  if (errors.length || failed.length)
    throw Error(JSON.stringify({ errors, failed }));
  console.log(
    JSON.stringify(
      {
        url,
        http: 200,
        productionHelpersAbsent: true,
        serviceWorker: true,
        offlineReload: true,
        raidFPS: Math.round(fps),
        errors,
        failed,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        errors,
        failed,
        body: (await page.content()).slice(0, 2000),
        caches: await page.evaluate(async () => ({
          keys: await caches.keys(),
          entries: await Promise.all(
            (await caches.keys()).map(async (k) =>
              (await (await caches.open(k)).keys()).map((r) => r.url),
            ),
          ),
        })),
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: "test-results/production-failure.png" });
  throw error;
} finally {
  await browser.close();
}
