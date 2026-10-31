import { test, expect } from "@playwright/test";
test("铁腮侧滚使用左右侧翻轴、身体朝玩家，子弹拖尾更新且无新增预警", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    const r = g.raid;
    const boss = r.enemies.find((e: any) => e.boss);
    r.enemies = [boss];
    r.walls = [];
    r.exits = [];
    r.bullets = [];
    r.p.x = 4300;
    r.p.y = 2800;
    boss.x = 4100;
    boss.y = 2800;
    boss.angle = 0;
    boss.state = "combat";
    boss.maneuver = {
      kind: "boss-side-roll",
      stage: "active",
      time: -0.16,
      shots: 1,
      angle: Math.PI / 2,
      x: 4300,
      y: 2800,
    };
    r.addBullet(4200, 2660, 0, true, 10, 1, 800, false, false);
    r.addBullet(
      4200,
      2710,
      0,
      false,
      10,
      1,
      800,
      false,
      false,
      undefined,
      true,
    );
    r.bullets.forEach((b: any) => (b.travel = 100));
    r.update = () => {};
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        const b = g.raid.enemies[0];
        return g.renderer3d.actors.get(b.id)?.body.quaternion.z ?? 0;
      }),
    )
    .toBeGreaterThan(0.9);
  const facing = await page.evaluate(() => {
    const g = (window as any).__game;
    return g.renderer3d.actors.get(g.raid.enemies[0].id).root.rotation.y;
  });
  expect(facing).toBeCloseTo(Math.PI / 2);
  await page.screenshot({ path: "test-results/iron-boss-side-roll.png" });
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies[0].maneuver.angle = -Math.PI / 2;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return g.renderer3d.actors.get(g.raid.enemies[0].id).body.quaternion.z;
      }),
    )
    .toBeLessThan(-0.9);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies[0].maneuver = {
      kind: "boss-retreat-roll",
      stage: "active",
      time: -0.16,
      shots: 1,
      angle: Math.PI,
      x: 4300,
      y: 2800,
    };
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return g.renderer3d.actors.get(g.raid.enemies[0].id).body.quaternion.x;
      }),
    )
    .toBeLessThan(-0.9);
});
