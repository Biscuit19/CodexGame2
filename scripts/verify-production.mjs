import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const url = process.argv[2] || "http://127.0.0.1:4173/";
if (process.env.EXPECTED_BUILD) {
  let found = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const r = await fetch(new URL(`build.json?t=${Date.now()}`, url));
      if (r.ok && (await r.json()).commit === process.env.EXPECTED_BUILD) {
        found = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!found)
    throw Error("Published revision did not reach the requested commit");
}
const browser = await chromium.launch({
  executablePath: process.env.CI
    ? undefined
    : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
  ],
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
await mkdir("test-results", { recursive: true });
try {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  expect(response.status()).toBe(200);
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await expect(
    page.locator('[data-action="new-mode"][data-id="standard"]'),
  ).toHaveClass(/selected/);
  await page.getByRole("button", { name: "创建并进入基地" }).click();
  await expect(page.locator(".base-tile")).toHaveCount(5);
  expect(await page.evaluate(() => typeof window.__game)).toBe("undefined");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.screenshot({ path: "test-results/production-home.png" });
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#scene3d")).toBeVisible();
  await expect(page.locator("#raid-time")).toBeVisible();
  await page.keyboard.press("Shift");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyD");
  await expect(page.locator("#sprint-state")).toHaveText("疾跑开启");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(20);
  await expect(page.locator(".equipped-grid")).toBeVisible();
  await expect(page.locator('[data-slot="ammo"]')).toBeVisible();
  await expect(page.locator('[data-slot="melee"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "左侧背包" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/production-map1.png" });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "游戏菜单", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#game-menu")).toBeVisible();
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(
    page
      .locator("#game-menu")
      .getByRole("button", { name: "退出本局", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "退出本局", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "读取存档", exact: true }).click();
  await page.getByRole("button", { name: "读取", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  await expect(page.getByRole("region", { name: "右侧仓库" })).toBeVisible();
  await expect(page.locator('[data-grid="stash"] > *')).toHaveCount(60);
  await page.locator('[data-grid="stash"] [data-item="w3"]').click();
  await expect(page.locator("#item-menu .item-description")).toHaveText(
    "中距离 · 稳定点射",
  );
  await expect(
    page.locator("#item-menu").getByRole("button", { name: "放入安全箱" }),
  ).toHaveCount(0);
  if (errors.length || failed.length)
    throw Error(JSON.stringify({ errors, failed }));
  console.log(
    JSON.stringify(
      {
        url,
        http: 200,
        productionHelpersAbsent: true,
        map1WebGL: true,
        pauseAbort: true,
        offlineLoad: true,
        errors,
        failed,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error({
    errors,
    failed,
    body: (await page.locator("body").innerText()).slice(0, 2000),
  });
  await page.screenshot({ path: "test-results/production-failure.png" });
  throw e;
} finally {
  await browser.close();
}
