import { test, expect } from "@playwright/test";
for (const empty of [false, true])
  test(`出战检查确认后关闭基地顶层弹窗，战斗菜单与背包可正常操作（${empty ? "空装" : "缺食物"}）`, async ({
    page,
  }) => {
    await page.goto("/?test=1");
    await page
      .getByRole("button", { name: "临时测试入口", exact: true })
      .click();
    await page.evaluate((empty) => {
      const s = (window as any).__game.save;
      s.pack = [];
      s.equipment.food = null;
      if (empty)
        for (const k of Object.keys(s.equipment)) s.equipment[k] = null;
    }, empty);
    await page.getByRole("button", { name: "进入地图一", exact: true }).click();
    await page.getByRole("button", { name: "开始行动", exact: true }).click();
    await expect(page.locator("#base-menu")).toHaveJSProperty("open", true);
    await page.getByRole("button", { name: "继续前往", exact: true }).click();
    await expect(page.locator(".raid-hud")).toBeVisible();
    await expect(page.locator("#base-menu")).toHaveJSProperty("open", false);
    await expect(page.locator("#base-menu")).toBeEmpty();
    await page.evaluate(() => {
      (window as any).__game.raid.enemies = [];
    });
    await page.locator(".raid-timer").click();
    await expect(page.locator("#game-menu")).toHaveJSProperty("open", true);
    await page.getByRole("button", { name: "继续游戏", exact: true }).click();
    await page.keyboard.press("Tab");
    await expect(page.locator(".inventory-panel")).toBeVisible();
    await page.screenshot({
      path: `test-results/chrome-preflight-clean-transition-${empty ? "empty" : "food"}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(page.locator(".inventory-panel")).toHaveCount(0);
  });
