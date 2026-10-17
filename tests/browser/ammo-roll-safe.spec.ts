import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口" }).click();
}
test("Chrome安全箱升级使用顶层弹窗，实际可点击、购买、关闭和Esc", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator('[data-action="safe-menu"]').click();
  const modal = page.locator("#base-menu");
  await expect(modal).toBeVisible();
  expect(await modal.evaluate((e) => e.matches(":modal"))).toBe(true);
  await expect(modal).toContainText("升级安全箱");
  const upgrade = modal.locator('[data-action="safe"][data-id="1"]');
  expect(
    await upgrade.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return el.contains(
        document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
      );
    }),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-safe-upgrade-native.png",
  });
  await upgrade.click();
  expect(await page.evaluate(() => (window as any).__game.save.safe)).toBe(1);
  await expect(modal).not.toBeVisible();
  await page.locator('[data-action="safe-menu"]').click();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(page.locator(".warehouse-panel")).toBeVisible();
  await page.locator('[data-action="safe-menu"]').click();
  await modal.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(modal).not.toBeVisible();
});
test("实际拖拽弹药补满120发，拖到主副武器装填并卸回旧弹，装备子弹同步", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.ammo = null;
    g.save.pack = [
      d.makeItem("m2", 22),
      d.makeItem("m2", 120),
      d.makeItem("m2", 20),
    ];
    g.render();
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page
    .locator('[data-grid="pack"] [data-item="m2"]')
    .first()
    .dragTo(page.locator('[data-slot="ammo"]'));
  let state = await page.evaluate(() => {
    const s = (window as any).__game.save;
    return { ammo: s.equipment.ammo, pack: s.pack };
  });
  expect(state.ammo.qty).toBe(120);
  expect(state.pack.map((i: any) => i.qty)).toEqual([42]);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.primary.loaded = { tier: 1, count: 17 };
    g.save.equipment.secondary = d.makeItem("w3");
    g.save.equipment.secondary.loaded = { tier: 2, count: 9 };
    g.save.pack = [
      d.makeItem("m3", 22),
      d.makeItem("m3", 120),
      d.makeItem("m3", 20),
    ];
    g.render();
  });
  await page
    .locator('[data-grid="pack"] [data-item="m3"]')
    .first()
    .dragTo(page.locator('[data-slot="primary"]'));
  const result = await page.evaluate(async () => {
    const s = (window as any).__game.save,
      d = await import("/src/data.ts");
    return {
      gun: s.equipment.primary.loaded,
      ammo: s.equipment.ammo,
      pack: s.pack,
      capacity: d.db[s.equipment.primary.id].mag,
    };
  });
  expect(result.gun).toMatchObject({ tier: 3, count: result.capacity });
  expect(result.ammo).toMatchObject({ id: "m3", qty: 120 });
  expect(
    result.pack
      .filter((i: any) => i.id === "m1")
      .reduce((n: number, i: any) => n + i.qty, 0),
  ).toBe(17);
  await page
    .locator('[data-slot="ammo"] .equipped-item')
    .dragTo(page.locator('[data-slot="secondary"]'));
  expect(
    await page.evaluate(
      () => (window as any).__game.save.equipment.secondary.loaded.tier,
    ),
  ).toBe(3);
  await page.screenshot({
    path: "test-results/chrome-drag-ammo-equipped-guns.png",
  });
});
test("八方向闪避均为前后滚翻，横向与斜向没有绕自身竖轴转圈", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.paused = true;
    r.p.x = 1000;
    r.p.y = 1000;
  });
  for (let n = 0; n < 8; n++) {
    const direction = (n * Math.PI) / 4;
    const pose = await page.evaluate((direction) => {
      const g = (window as any).__game,
        r = g.raid,
        rig = g.renderer3d.actors.get("player");
      r.p.angle = 0;
      r.p.roll = 0;
      r.p.rollCooldown = 0;
      r.p.stamina = 100;
      r.roll(Math.cos(direction), Math.sin(direction));
      r.p.roll = 0.25;
      g.renderer3d.updateRig(
        rig,
        r.p.x,
        r.p.y,
        r.p.angle,
        0,
        r.p.roll,
        1,
        1,
        true,
        direction,
        r.p.rollAim,
      );
      return {
        x: rig.body.quaternion.x,
        y: rig.body.quaternion.y,
        z: rig.body.quaternion.z,
        angle: Math.PI / 2 - rig.root.rotation.y,
      };
    }, direction);
    expect(Math.abs(pose.x)).toBeGreaterThan(0.5);
    expect(Math.abs(pose.y)).toBeLessThan(0.001);
    expect(Math.abs(pose.z)).toBeLessThan(0.001);
    expect(Math.abs(Math.cos(pose.angle - direction))).toBeCloseTo(1, 5);
    await page.screenshot({
      path: `test-results/chrome-somersault-direction-${n}.png`,
    });
  }
});
