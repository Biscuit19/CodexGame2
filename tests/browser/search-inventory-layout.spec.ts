import { test, expect } from "@playwright/test";
test("搜索逐件揭示和拾取保留背包滚动，紧凑栏与弹药合计正确", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.bag = d.makeItem("b5");
    g.save.equipment.ammo = d.makeItem("m1", 60);
    g.save.equipment.primary = d.makeItem("w3");
    g.save.equipment.primary.loaded = { tier: 1, count: 30 };
    g.save.pack = Array.from({ length: 60 }, () => d.makeItem("c0_0"));
    g.save.pack.push(d.makeItem("m1", 75), d.makeItem("m2", 20));
    g.deploy(true);
    const r = g.raid;
    r.enemies = [];
    const c = r.containers[0];
    c.locked = false;
    c.items = [d.makeItem("c4_0"), d.makeItem("c0_1")];
    c.revealed = 0;
    r.p.x = c.x;
    r.p.y = c.y;
    r.startSearch(c);
    r.onChange();
  });
  const scroll = page.locator("#raid-overlay .inventory-scroll");
  await expect(scroll).toBeVisible();
  const before = await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return el.scrollTop;
  });
  expect(before).toBeGreaterThan(100);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    for (let n = 0; n < 430; n++)
      r.update(1 / 60, new Set(), {
        x: r.p.x + 100,
        y: r.p.y - 24,
        down: false,
      });
  });
  expect(
    await page.evaluate(() => (window as any).__game.raid.search.revealed),
  ).toBeGreaterThanOrEqual(1);
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeCloseTo(before, 0);
  const heading = page.locator("#raid-overlay .pack-heading");
  const boxes = await heading
    .locator("h2,.panel-heading > span,.raid-income,button")
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, right: r.right };
      }),
    );
  expect(boxes.length).toBe(4);
  expect(
    Math.max(...boxes.map((b) => b.top)) - Math.min(...boxes.map((b) => b.top)),
  ).toBeLessThan(12);
  const headerBox = await heading.boundingBox();
  expect(Math.max(...boxes.map((b) => b.right))).toBeLessThanOrEqual(
    headerBox!.x + headerBox!.width + 1,
  );
  const ammo = page.locator('[aria-label="子弹装备位"] .equipped-item');
  await expect(ammo).toContainText("135 发");
  await expect(ammo).not.toContainText("弹匣");
  await expect(ammo).not.toContainText("备弹");
  const durability = page.locator(
    '[aria-label="主武器装备位"] .equipment-durability',
  );
  expect(
    await durability.evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(18);
  await page.screenshot({ path: "test-results/search-pack-layout.png" });
  await page.evaluate(() => (window as any).__game.raid.take(0, false, true));
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeCloseTo(before, 0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(scroll).toBeVisible();
  expect(await scroll.evaluate((el) => el.clientHeight)).toBeGreaterThan(180);
  await page.screenshot({ path: "test-results/search-pack-720.png" });
});
test("未携带背包入局免费穿戴布兜", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  const bag = await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.equipment.bag = null;
    g.deploy(true);
    return g.save.equipment.bag?.id;
  });
  expect(bag).toBe("b1");
});
