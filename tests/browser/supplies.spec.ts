import { acceptPreflightIfPresent } from "./helpers/deploy";
import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "新的游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
}

test("首次搜索未拾取也点亮图鉴，顶中提示、未发现问号与大字描述正常", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await acceptPreflightIfPresent(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts"),
      r = g.raid,
      c = r.containers[0];
    r.enemies = [];
    g.save.pack = Array.from({ length: 20 }, () => d.makeItem("c0_1"));
    c.items = [d.makeItem("c0_0")];
    c.revealed = 0;
    c.locked = false;
    c.type = "box";
    c.x = r.p.x;
    c.y = r.p.y;
    r.near = c;
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator('.loot-panel [data-item="c0_0"]')).toBeVisible();
  await expect(page.locator("#discovery-feed")).toContainText("宜猫六角扳手");
  await expect(page.locator(".discovery-unlock")).toHaveText("解锁");
  const toast = await page.locator("#discovery-feed").boundingBox();
  expect(Math.abs(toast!.x + toast!.width / 2 - 720)).toBeLessThan(2);
  expect(toast!.y).toBeLessThan(80);
  const discovered = await page.evaluate(() => {
    const s = (window as any).__game.save;
    return {
      known: s.collection.includes("c0_0"),
      picked: s.pack.some((i: any) => i.id === "c0_0"),
    };
  });
  expect(discovered).toEqual({ known: true, picked: false });
  await page.screenshot({
    path: "test-results/search-discovery-without-pickup.png",
  });
  await page.evaluate(() =>
    (window as any).__game.raid.finish(false, "测试死亡"),
  );
  await page.locator('[data-action="close-result"]').click();
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  const locked = page.locator('.collection-item[data-id="c5_14"]');
  await expect(locked).toBeDisabled();
  await expect(locked.locator('[data-art="unknown"]')).toHaveCount(1);
  await expect(locked.locator('[data-art="c5_14"]')).toHaveCount(0);
  await expect(locked).toHaveText("喵威雷神锤");
  await page.screenshot({
    path: "test-results/collection-mystery.png",
    fullPage: true,
  });
  await page.locator('.collection-item[data-id="c0_0"]').click();
  await expect(page.locator(".collection-description")).toHaveText(
    "家具还没装好，纸箱已经住满了。",
  );
  expect(
    await page
      .locator(".collection-description")
      .evaluate((el) => parseInt(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(28);
});

test("十种补给展示三种回血效果，持续回血可暂停且没有浏览器title重复提示", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await page.locator('[data-action="category"][data-id="food"]').click();
  await expect(page.locator(".shop-grid .item-slot")).toHaveCount(10);
  expect(
    await page
      .locator(".shop-grid .item-slot > strong")
      .evaluateAll((els) =>
        els.every(
          (el) =>
            el.clientHeight >= parseFloat(getComputedStyle(el).fontSize) &&
            getComputedStyle(el).overflow === "visible" &&
            el.nextElementSibling!.getBoundingClientRect().top >=
              el.getBoundingClientRect().bottom + 3,
        ),
      ),
  ).toBe(true);
  await expect(page.locator("[data-item][title]")).toHaveCount(0);
  await page.locator('.shop-grid [data-item="c1_9"]').hover();
  await expect(page.locator("#item-tooltip")).toContainText(
    "10 秒内持续恢复 22 生命",
  );
  await page.waitForTimeout(800);
  await expect(page.locator("#item-tooltip")).toHaveCount(1);
  await page.locator('.shop-grid [data-item="f4"]').click();
  await expect(page.locator("#item-menu")).toContainText(
    "立即恢复 60 生命",
  );
  await page.screenshot({ path: "test-results/supply-healing-effects.png" });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await acceptPreflightIfPresent(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.raid.enemies = [];
    g.raid.p.hp = 30;
    g.save.pack = [d.makeItem("c1_9")];
  });
  await page.keyboard.press("Tab");
  await page.locator('.pack-grid [data-item="c1_9"]').click();
  await page
    .locator("#item-menu")
    .getByRole("button", { name: "食用", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__game.raid.regeneration.remaining),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press("Tab");
  await expect(page.locator("#regen-readout")).toContainText("持续回血");
  await expect(page.locator("[data-item][title]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).toBeVisible();
  const paused = await page.evaluate(() => {
    const r = (window as any).__game.raid;
    return { hp: r.p.hp, time: r.regeneration.remaining };
  });
  await page.waitForTimeout(600);
  expect(
    await page.evaluate(() => {
      const r = (window as any).__game.raid;
      return { hp: r.p.hp, time: r.regeneration.remaining };
    }),
  ).toEqual(paused);
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.raid.p.hp))
    .toBeGreaterThan(paused.hp + 0.25);
  await page.screenshot({ path: "test-results/ongoing-healing.png" });
});
