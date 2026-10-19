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
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect(page.locator(".header-state")).toContainText("999,999");
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  await expect(page.locator(".collection-item.found")).toHaveCount(70);
  await page.locator('.collection-item[data-id="c4_0"]').click();
  const collectionDialog = page.locator("#collection-dialog");
  await expect(collectionDialog).toBeVisible();
  expect(await collectionDialog.evaluate((el) => el.matches(":modal"))).toBe(
    true,
  );
  await expect(
    collectionDialog.locator(".collection-description"),
  ).toContainText("那颗非洲来的心");
  await page.screenshot({
    path: "test-results/production-chrome-collection-detail.png",
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await expect(page.locator(".map-cards")).not.toContainText("尚未解锁");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "开始界面", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await expect(
    page.locator('.save-row [data-action="load-slot"]:disabled'),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "新的游戏", exact: true }).click();
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
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await expect(page.locator(".shop-grid .item-art")).toHaveCount(20);
  await expect(page.locator(".shop-grid svg")).toHaveCount(0);
  await page.locator("#weapon-filter").selectOption("shotgun");
  await expect(page.locator(".shop-grid .item-art")).toHaveCount(4);
  await page.locator('.shop-grid [data-item="w16"]').click();
  await expect(page.locator("#item-menu")).toContainText("14×7");
  await page
    .locator("#item-menu")
    .getByRole("button", { name: /购买/ })
    .click();
  await page.screenshot({
    path: "test-results/production-weapon-shop.png",
    fullPage: true,
  });
  await page.locator('[data-action="category"][data-id="food"]').click();
  await expect(page.locator(".shop-grid .item-slot")).toHaveCount(10);
  await expect(page.locator("[data-item][title]")).toHaveCount(0);
  await page.locator('.shop-grid [data-item="c1_9"]').click();
  await expect(page.locator("#item-menu")).toContainText(
    "10 秒内持续恢复 22 生命",
  );
  await page.locator('.shop-grid [data-item="f4"]').click();
  await expect(page.locator("#item-menu")).toContainText("立即恢复 60 生命");
  await page.screenshot({ path: "test-results/production-supplies.png" });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page
    .locator('[data-grid="stash"] [data-item="w16"]')
    .dragTo(page.locator('[data-slot="primary"]'));
  await expect(
    page.locator('[data-slot="primary"] [data-art="w16"]'),
  ).toBeVisible();
  await page
    .locator('[data-slot="primary"] .equipped-item')
    .dragTo(page.locator('[data-slot="secondary"]'));
  await expect(
    page.locator('[data-slot="secondary"] .equipped-item'),
  ).toHaveAttribute("data-item", "w16");
  await page
    .locator('[data-slot="secondary"] .equipped-item')
    .dragTo(page.locator('[data-slot="primary"]'));
  await page.locator('[data-action="safe-menu"]').click();
  await expect(page.locator("#base-menu")).toBeVisible();
  await expect(page.locator("#base-menu")).toContainText("升级安全箱");
  expect(
    await page.locator("#base-menu").evaluate((el) => el.matches(":modal")),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/production-chrome-safe-upgrade.png",
  });
  await page
    .locator("#base-menu")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await expect(page.locator("#sort")).toHaveValue("type");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#scene3d")).toBeVisible();
  await expect(page.locator("#raid-time")).toBeVisible();
  await expect(page.locator("#weapon-name")).toHaveText("抓板870");
  await expect(page.locator("#food-name")).toHaveText("小鱼干");
  await expect(page.locator('#food-art [data-art="f1"]')).toBeVisible();
  await expect(page.locator("#mag-count")).toHaveText("06");
  await page.mouse.move(1000, 500);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(page.locator("#mag-count")).toHaveText("05");
  await page.screenshot({ path: "test-results/production-shotgun.png" });
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
  await expect(page.locator('#weapon-art [data-art="w16"]')).toBeVisible();
  await expect(page.locator('#ammo-art [data-art="m1"]')).toBeVisible();
  await expect(
    page.getByText("旧铁盒（安全箱）", { exact: true }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
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
  await page.locator('[data-grid="stash"] .empty-slot').last().click();
  await expect(page.locator("#item-menu")).toHaveCount(0);
  await page.getByRole("button", { name: "全部放回", exact: true }).click();
  await expect(page.locator('[data-grid="pack"] .item-slot')).toHaveCount(0);
  await page.locator('[data-grid="stash"] [data-item="w3"]').click();
  await expect(page.locator("#item-menu .item-description")).toHaveText(
    "三条尾巴一起摇，后坐力也只好跟着讲道理。",
  );
  await expect(
    page.locator("#item-menu").getByRole("button", { name: "放入安全箱" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  await expect(page.locator(".collection-item")).toHaveCount(70);
  await expect(page.locator(".collection-item .item-art")).toHaveCount(70);
  await expect(
    page.locator(".collection-item .unknown-collectible svg"),
  ).toHaveCount(70);
  await expect(page.locator('.collection-item[data-id="c4_0"]')).toBeDisabled();
  await expect(
    page.locator('.collection-item[data-id="c4_0"] [data-art="unknown"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.collection-item[data-id="c4_0"] [data-art="c4_0"]'),
  ).toHaveCount(0);
  await expect(page.locator('.collection-item[data-id="c4_0"]')).toHaveText(
    "星洲猫心",
  );
  const collectibleAtlasCount = await page
    .locator(".collection-item .art-glyph")
    .evaluateAll(async (els) => {
      const urls = [
        ...new Set(els.map((el) => el.style.backgroundImage.slice(5, -2))),
      ];
      for (const url of urls) {
        const img = new Image();
        img.src = url;
        await img.decode();
      }
      return urls.length;
    });
  expect(collectibleAtlasCount).toBe(0);
  await page.screenshot({
    path: "test-results/production-collectibles-offline.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".base-tile")).toHaveCount(5);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#raid-time")).toBeVisible();
  await page.keyboard.press("Digit3");
  // Navigate using the rendered minimap instead of fixed key durations, which
  // can overshoot on a busy software-rendering runner. No development helpers.
  const extractionRoute = [
    [1460, 1580],
    [1460, 1220],
    [1580, 1220],
    [1580, 940],
  ].map(([x, y]) => [(x * 9000) / 2400, (y * 6000) / 1800]);
  let waypoint = 0;
  for (let step = 0; step < 600; step++) {
    if (await page.locator("#result-dialog").isVisible()) break;
    const position = await page.locator("#minimap").evaluate((canvas) => {
      const c = canvas.getContext("2d"),
        pixels = c.getImageData(0, 0, canvas.width, canvas.height).data;
      let x = 0,
        y = 0,
        count = 0;
      for (let n = 0; n < pixels.length; n += 4) {
        if (
          pixels[n] > 235 &&
          pixels[n + 1] > 200 &&
          pixels[n + 1] < 230 &&
          pixels[n + 2] > 130 &&
          pixels[n + 2] < 165
        ) {
          x += ((n / 4) % canvas.width) + 0.5;
          y += Math.floor(n / 4 / canvas.width) + 0.5;
          count++;
        }
      }
      if (!count)
        throw Error("Player marker missing from the rendered minimap");
      return {
        x:
          Number(canvas.dataset.viewX) +
          (x / count / canvas.width) * Number(canvas.dataset.viewWidth),
        y:
          Number(canvas.dataset.viewY) +
          (y / count / canvas.height) * Number(canvas.dataset.viewHeight),
      };
    });
    const [targetX, targetY] = extractionRoute[waypoint];
    const dx = targetX - position.x,
      dy = targetY - position.y;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) {
      if (++waypoint === extractionRoute.length) break;
      continue;
    }
    const horizontal = Math.abs(dx) > 22;
    const key = horizontal
      ? dx < 0
        ? "KeyA"
        : "KeyD"
      : dy < 0
        ? "KeyW"
        : "KeyS";
    const milliseconds = Math.max(
      60,
      Math.min(300, (Math.abs(horizontal ? dx : dy) / 270) * 1000),
    );
    await page.keyboard.down(key);
    await page.waitForTimeout(milliseconds);
    await page.keyboard.up(key);
    await page.waitForTimeout(100);
  }
  const resultDialog = page.locator("#result-dialog");
  await expect(resultDialog).toBeVisible({ timeout: 10000 });
  expect(await resultDialog.evaluate((el) => el.matches(":modal"))).toBe(true);
  await expect(
    resultDialog.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible();
  await expect(resultDialog.locator(".result-stats")).toContainText(
    "带出物资价值",
  );
  await expect(
    resultDialog
      .locator(".result-stats > div")
      .filter({ has: page.locator("span", { hasText: "带出物资价值" }) })
      .locator("strong"),
  ).toHaveText("◈ 0");
  await page.screenshot({
    path: "test-results/production-chrome-extraction-result.png",
  });
  await resultDialog.locator('[data-action="close-result"]').click();
  await expect(resultDialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
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
        pngEquipmentAndTwentyWeapons: true,
        shotgunPurchaseEquipAndFire: true,
        seventyMysteryCollectibleIconsOffline: true,
        primarySecondaryDrag: true,
        tenSuppliesAndThreeHealingEffects: true,
        automaticFoodEquipmentAndHUD: true,
        unknownCollectionConcealsArtAndPrice: true,
        chromeCollectionNativeDialog: true,
        temporaryTestingDoesNotCreateSlots: true,
        largeWeaponAndAmmoIcons: true,
        chromeRealExtractionNativeDialog: true,
        broughtInItemsExcludedFromExtractionValue: true,
        baseSubpageEscape: true,
        chromeSafeUpgradeNativeDialog: true,
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
