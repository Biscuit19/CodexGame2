import { test, expect } from "@playwright/test";
test("乡野UI：标题、基地悬浮、仓库、商店、图鉴和设置维持可操作", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/?test=1");
  await page.screenshot({ path: "test-results/polish-title.png" });
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  const entry = page.getByRole("button", { name: "仓库配装", exact: true });
  await entry.hover();
  await page.waitForTimeout(300);
  expect(await entry.evaluate((e) => getComputedStyle(e).transform)).not.toBe(
    "none",
  );
  await page.screenshot({ path: "test-results/polish-base.png" });
  await entry.click();
  await expect(page.locator(".warehouse-panel")).toBeVisible();
  await page.screenshot({ path: "test-results/polish-warehouse.png" });
  await page.getByRole("button", { name: /扩容 ◈/ }).click();
  await expect(page.getByRole("dialog")).toContainText("仓库扩容");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await page.screenshot({ path: "test-results/polish-shop.png" });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: /收藏图鉴/, exact: false }).click();
  await page.screenshot({ path: "test-results/polish-collection.png" });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(page.getByLabel("基地音乐", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/polish-settings.png" });
  await page.keyboard.press("Escape");
});
test("战斗HUD显示恢复量、装备耐久条，背包及Esc顶层菜单正常且窄屏不重叠", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game;
    g.deploy(true);
    g.raid.enemies = [];
    const d = await import("/src/data.ts" as string);
    g.save.equipment.food = d.makeItem("c1_9");
    g.save.equipment.armor = d.makeItem("a3");
    g.save.equipment.helmet = d.makeItem("h2");
    g.raid.p.hp = 37;
    g.raid.p.stamina = 44;
  });
  await expect(page.locator("#food-effect")).toContainText("22");
  await expect(page.locator("#food-effect")).toContainText("10");
  await expect(page.locator(".protection-track")).toHaveCount(2);
  await page.screenshot({ path: "test-results/polish-combat.png" });
  await page.keyboard.press("Tab");
  await expect(page.locator(".raid-inventory-layout")).toBeVisible();
  await page.screenshot({ path: "test-results/polish-raid-bag.png" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).toBeVisible();
  await page.screenshot({ path: "test-results/polish-pause.png" });
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "test-results/polish-combat-1100.png" });
  const boxes = await page
    .locator(".vitals,.food-hud,.weapon-hud")
    .evaluateAll((es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
      }),
    );
  expect(
    boxes.every((b) => b.x >= 0 && b.right <= 1100 && b.bottom <= 800),
  ).toBe(true);
  expect(boxes[0].right).toBeLessThan(boxes[1].x);
  expect(boxes[1].right).toBeLessThan(boxes[2].x);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    const e = r.exits.find((e: any) => e.name === "麦田东侧 C");
    r.p.x = e.x;
    r.p.y = e.y;
  });
  await expect(page.getByRole("button", { name: /返回基地/ })).toBeVisible({
    timeout: 10000,
  });
  await page.screenshot({ path: "test-results/polish-result.png" });
  await page.getByRole("button", { name: /返回基地/ }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
});
