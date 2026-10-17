import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
}

test("20款枪和全部装备使用独立PNG图标，可按四类筛选并查看霰弹数值", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await start(page);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.defeated = ["iron", "swift", "yeed"];
    g.save.coins = 999999;
    g.render();
  });
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await expect(page.locator(".shop-grid .item-art")).toHaveCount(20);
  await expect(page.locator(".shop-grid svg")).toHaveCount(0);
  expect(
    await page
      .locator(".shop-grid .art-glyph")
      .evaluateAll(
        (els) =>
          new Set(els.map((el) => (el as HTMLElement).style.backgroundPosition))
            .size,
      ),
  ).toBe(20);
  await page.evaluate(async () => {
    const urls = [
      ...new Set(
        Array.from(
          document.querySelectorAll<HTMLElement>(".shop-grid .art-glyph"),
          (el) => el.style.backgroundImage.slice(5, -2),
        ),
      ),
    ];
    for (const url of urls) {
      const img = new Image();
      img.src = url;
      await img.decode();
    }
  });
  await page.screenshot({
    path: "test-results/weapon-shop.png",
    fullPage: true,
  });
  for (const [category, count] of [
    ["smg", 5],
    ["rifle", 8],
    ["sniper", 3],
    ["shotgun", 4],
  ] as const) {
    await page.locator("#weapon-filter").selectOption(category);
    await expect(page.locator(".shop-grid .item-art")).toHaveCount(count);
  }
  await page.locator('.shop-grid [data-item="w16"]').click();
  await expect(page.locator("#item-menu")).toContainText("霰弹枪");
  await expect(page.locator("#item-menu")).toContainText("14×7");
  await page.screenshot({
    path: "test-results/shotgun-shop.png",
    fullPage: true,
  });
  await page.getByRole("heading", { name: "商品", exact: true }).click();
  for (const [category, count] of [
    ["armor", 15],
    ["ammo", 4],
    ["food", 10],
  ] as const) {
    await page
      .locator(`[data-action="category"][data-id="${category}"]`)
      .click();
    await expect(page.locator(".shop-grid .item-art")).toHaveCount(count);
    await expect(page.locator(".shop-grid svg")).toHaveCount(0);
    await page.screenshot({
      path: `test-results/equipment-${category}.png`,
      fullPage: true,
    });
  }
  expect(failures).toEqual([]);
});

test("手持实体切换20款独立枪械模型，三尾与霰弹枪实际可见", async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#scene3d")).toBeVisible();
  const result = await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    r.paused = true;
    r.p.x = 1000;
    r.p.y = 1550;
    r.p.angle = 0;
    const signatures = new Set<string>(),
      ids: string[] = [];
    for (const w of d.weapons) {
      g.save.equipment.primary = d.makeItem(w.id);
      g.renderer3d.render(r, g.renderer);
      const gun = g.renderer3d.actors.get("player").gun;
      ids.push(gun.userData.weaponId);
      signatures.add(
        gun.children
          .map(
            (m: any) =>
              `${m.geometry?.attributes.position.count}:${m.material?.color?.getHexString()}`,
          )
          .join(";"),
      );
    }
    g.save.equipment.primary = d.makeItem("w3");
    g.renderer3d.camera.zoom = 2;
    g.renderer3d.camera.updateProjectionMatrix();
    g.renderer3d.render(r, g.renderer);
    return { ids: new Set(ids).size, signatures: signatures.size };
  });
  expect(result.ids).toBe(20);
  expect(result.signatures).toBe(20);
  await page.screenshot({ path: "test-results/three-tail-held.png" });
  const shot = await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game,
      r = g.raid;
    g.save.equipment.primary = d.makeItem("w16");
    r.mag = 2;
    r.fireCool = 0;
    r.shoot();
    g.renderer3d.render(r, g.renderer);
    return {
      bullets: r.bullets.length,
      mag: r.mag,
      model: g.renderer3d.actors.get("player").gun.userData.weaponId,
    };
  });
  expect(shot).toEqual({ bullets: 7, mag: 1, model: "w16" });
  await page.screenshot({ path: "test-results/shotgun-held.png" });
  expect(errors).toEqual([]);
});
