import { test, expect } from "@playwright/test";
test("矮胖猫的装备、眨眼、尾巴和前后滚翻实际渲染，通知均位于顶部", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "新的游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.raid.enemies = [];
    g.raid.p.x = 1000;
    g.raid.p.y = 1000;
    g.save.equipment.helmet = d.makeItem("h3");
    g.save.equipment.armor = d.makeItem("a3");
    g.raid.spawn(1100, 1000, 4, 2).cool = 999;
    g.raid.p.angle = Math.PI / 2;
    g.raid.paused = true;
  });
  await page.waitForTimeout(400);
  const inspect = () =>
    page.evaluate(() => {
      const g = (window as any).__game,
        renderer = g.renderer3d;
      const rig = renderer.actors.get("player");
      return {
        scale: rig.root.scale.x,
        eyes: rig.eyes.map((x: any) => x.scale.y),
        tail: rig.tailJoints.map((x: any) => x.rotation.y),
        helmet: rig.helmet.visible,
        vest: rig.vest.visible,
      };
    });
  const before = await inspect();
  expect(before.scale).toBeLessThan(0.85);
  expect(before.helmet && before.vest).toBe(true);
  expect(before.tail).toHaveLength(6);
  await page.waitForTimeout(200);
  expect((await inspect()).tail).not.toEqual(before.tail);
  let blink = false;
  for (let n = 0; n < 55; n++) {
    if ((await inspect()).eyes[0] < 0.8) blink = true;
    await page.waitForTimeout(90);
  }
  expect(blink).toBe(true);
  await page.screenshot({ path: "test-results/chrome-chubby-cats.png" });
  for (const direction of [1, -1]) {
    const rotation = await page.evaluate((direction) => {
      const g = (window as any).__game,
        r = g.raid;
      r.p.angle = direction === 1 ? 0 : Math.PI;
      r.p.roll = 0;
      r.p.rollCooldown = 0;
      r.p.stamina = 100;
      r.roll(1, 0);
      r.p.roll = 0.25;
      const rig = g.renderer3d.actors.get("player");
      g.renderer3d.updateRig(
        rig,
        r.p.x,
        r.p.y,
        r.p.angle,
        0,
        0.25,
        3,
        3,
        true,
        0,
      );
      return {
        x: rig.body.quaternion.x,
        y: rig.body.quaternion.y,
        z: rig.body.quaternion.z,
      };
    }, direction);
    expect(Math.abs(rotation.x)).toBeGreaterThan(0.5);
    expect(Math.abs(rotation.y)).toBeLessThan(0.01);
    await page.screenshot({
      path: `test-results/chrome-cat-roll-${direction}.png`,
    });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    (window as any).__game.raid.notify("付费撤离测试");
  });
  const box = await page.locator("#toasts").boundingBox();
  expect(box!.y).toBeLessThan(100);
  expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(5);
});
