import { test, expect } from "@playwright/test";
async function start(page: any) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
}
test("枪械描述按枪型与品质着色、散射与每秒射速，商店提示并排", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await page.locator(".shop-grid [data-item=w0]").click();
  const m = page.locator("#item-menu");
  await expect(m).toContainText("常见 · 冲锋枪");
  await expect(m).toContainText("射速 12 发／秒");
  await expect(m).toContainText("散射 0.12");
  await expect(m).not.toContainText("耐久");
  await expect(m).not.toContainText("威力");
  await expect(m).not.toContainText("发／分");
  const colors = await m.evaluate((el) => [
    getComputedStyle(el.querySelector("h3")!).color,
    getComputedStyle(el.querySelector("span")!).color,
  ]);
  expect(colors[0]).toBe(colors[1]);
  await page.screenshot({
    path: "test-results/chrome-gun-description-per-second.png",
  });
  await page.locator(".shop-heading h2").click();
  const h = page.locator(".shop-heading h2"),
    hint = page.locator(".shop-heading .shop-shortcut");
  const a = await h.boundingBox(),
    b = await hint.boundingBox();
  expect(b!.x).toBeGreaterThan(a!.x + a!.width);
  expect(Math.abs(a!.y + a!.height / 2 - b!.y - b!.height / 2)).toBeLessThan(3);
  await page.locator(".shop-grid [data-item=w9]").click();
  await expect(m).toContainText("珍贵 · 狙击枪");
  await expect(m).toContainText("散射 0");
  await expect(m).toContainText("射速 0.75 发／秒");
  await page.locator(".shop-heading h2").click();
  await page.locator(".shop-grid [data-item=w16]").click();
  await expect(m).toContainText("霰弹枪");
  await expect(m).toContainText("散射 0.17");
});
test("两种出售确认弹窗窄版且按钮间隔清楚，取消与Esc保留物品", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.stash = [d.makeItem("c1_0"), d.makeItem("w0")];
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page
    .getByRole("button", { name: "出售珍贵及以下收集品", exact: true })
    .click();
  for (const confirm of ["确认出售", "确认批量出售"]) {
    const dialog = page.locator("#base-menu .sale-confirm-modal");
    await expect(dialog).toBeVisible();
    expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(490);
    const a = await dialog
      .getByRole("button", { name: confirm, exact: true })
      .boundingBox();
    const b = await dialog
      .getByRole("button", { name: "取消", exact: true })
      .boundingBox();
    expect(b!.y - (a!.y + a!.height)).toBeGreaterThanOrEqual(19);
    await page.screenshot({
      path: `test-results/chrome-${confirm}-compact.png`,
    });
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(() => (window as any).__game.save.stash.length),
    ).toBe(2);
    if (confirm === "确认出售") {
      await page.getByRole("button", { name: "批量出售", exact: true }).click();
      await page.locator(".batch-item > input").first().click();
      await page
        .getByRole("button", { name: "出售所选（1）", exact: true })
        .click();
    }
  }
});
test("斜下握刀、左右交替肩臂劈砍与回位，跑动脚印没有刀投影", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    r.walls = [];
    r.containers = [];
    r.p.x = 900;
    r.p.y = 4800;
    r.selectWeapon("melee");
    g.renderer3d.camera.zoom = 3;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  const aim = await page.evaluate(() => {
    const g = (window as any).__game;
    return g.renderer3d.project(g.raid.p.x, g.raid.p.y + 130, 0);
  });
  await page.mouse.move(aim.x, aim.y);
  await page.waitForTimeout(150);
  await page.screenshot({
    path: "test-results/chrome-knife-diagonal-hold.png",
  });
  for (const n of [1, 2]) {
    await page.mouse.click(aim.x, aim.y, { delay: 120 });
    await expect
      .poll(() => page.evaluate(() => (window as any).__game.raid.meleeSwing))
      .toBe(n);
    await page.evaluate(() => {
      const r = (window as any).__game.raid;
      r.paused = true;
      r.meleeCooldown = 0.45 * 0.78;
    });
    await page.waitForTimeout(100);
    const wind = await page.evaluate(() => {
      const k = (window as any).__game.renderer3d.actors.get("player").knife;
      return k.rotation.y;
    });
    expect(Math.sign(wind)).toBe(n === 1 ? -1 : 1);
    await page.screenshot({
      path: `test-results/chrome-knife-swing-${n}-windup.png`,
    });
    await page.evaluate(() => {
      (window as any).__game.raid.meleeCooldown = 0.45 * 0.39;
    });
    await page.waitForTimeout(100);
    const cut = await page.evaluate(() => {
      const k = (window as any).__game.renderer3d.actors.get("player").knife;
      return k.rotation.y;
    });
    expect(Math.sign(cut)).toBe(n === 1 ? 1 : -1);
    await page.screenshot({
      path: `test-results/chrome-knife-swing-${n}-cut.png`,
    });
    await page.evaluate(() => {
      const r = (window as any).__game.raid;
      r.meleeCooldown = 0;
      r.paused = false;
    });
  }
  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  const result = await page.evaluate(() => {
    const g = (window as any).__game,
      k = g.renderer3d.actors.get("player").knife;
    let shadows = 0;
    k.traverse((m: any) => {
      if (m.isMesh && m.castShadow) shadows++;
    });
    return { shadows, marks: g.raid.footprints.length, yaw: k.rotation.y };
  });
  expect(result.shadows).toBe(0);
  expect(result.marks).toBeGreaterThan(0);
  expect(result.yaw).toBeCloseTo(0);
  await page.screenshot({
    path: "test-results/chrome-pawprints-without-knife-shadow.png",
  });
  expect(errors).toEqual([]);
});
