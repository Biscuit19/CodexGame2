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
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.env.CI ? undefined : "/usr/bin/chromium"),
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
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const baseMenu = page.locator("#base-menu");
  expect(await baseMenu.evaluate((el) => el.matches(":modal"))).toBe(true);
  await expect(
    baseMenu.getByRole("button", { name: "返回开始界面", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/production-base-menu.png" });
  await baseMenu.getByRole("button", { name: "设置", exact: true }).click();
  await expect(baseMenu.getByText("主音量", { exact: true })).toBeVisible();
  await baseMenu
    .getByRole("button", { name: "返回基地菜单", exact: true })
    .click();
  await baseMenu.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(
    baseMenu.getByRole("heading", { name: "操作指南", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(baseMenu).toBeHidden();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#scene3d")).toBeVisible();
  await expect(page.locator("#raid-time")).toBeVisible();
  await expect(page.locator("#st-number")).toHaveText("100");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(700);
  await page.keyboard.up("KeyD");
  await expect(page.locator("#sprint-state")).toHaveText("疾跑");
  await page.keyboard.press("Digit3");
  await expect(page.locator("#sprint-state")).toHaveText("持刀加速");
  await page.keyboard.press("Digit1");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(20);
  await expect(page.locator(".equipped-grid")).toBeVisible();
  await expect(page.locator('[data-slot="ammo"]')).toBeVisible();
  await expect(page.locator('[data-slot="melee"]')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "左侧背包" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/production-map1.png" });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("#world,#scene3d"))
      el.style.zIndex = "2147483647";
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "游戏菜单", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#game-menu")).toBeVisible();
  expect(
    await page.locator("#game-menu").evaluate((el) => el.matches(":modal")),
  ).toBe(true);
  expect(
    await page
      .getByRole("button", { name: "继续游戏", exact: true })
      .evaluate((el) => {
        const b = el.getBoundingClientRect();
        return !!document
          .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
          ?.closest("#game-menu");
      }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/production-esc-menu.png" });
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
  await expect(page.locator('[data-grid="pack"] .item-value')).toHaveCount(0);
  await expect(page.locator(".equipped-grid .item-value")).toHaveCount(0);
  await page.locator('[data-grid="pack"] [data-item="f1"]').click();
  await expect(
    page.locator("#item-menu").getByRole("button", { name: /^出售/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "全部放回", exact: true }).click();
  await expect(page.locator('[data-grid="pack"] .item-slot')).toHaveCount(0);
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
        nativeTopLayerMenus: true,
        baseSettingsAndGuide: true,
        packBulkTransferAndSale: true,
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
