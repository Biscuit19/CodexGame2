import { acceptPreflightIfPresent } from "./helpers/deploy";
import { test, expect } from "@playwright/test";

test("33度斜视下乡村建筑主体与屋顶淡化，瞄准投影一致，实际受弹不打断搜索", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await acceptPreflightIfPresent(page);
  await page.evaluate(async () => {
    const g = (window as any).__game;
    const { villageBuildings } = await import("/src/village.ts" as string);
    g.raid.enemies = [];
    Object.assign(g.raid.p, {
      x: villageBuildings[1].x,
      y: villageBuildings[1].y,
      angle: Math.PI / 2,
    });
    g.raid.paused = true;
  });
  await page.waitForFunction(
    () => (window as any).__game.renderer3d.villageStage?.userData.assetsReady,
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const entry = (
          window as any
        ).__game.renderer3d.villageStage.userData.buildings.find(
          (b: any) => b.id === "clinic",
        );
        return entry.group.children.find((m: any) => m.name === "roof").material
          .opacity;
      }),
    )
    .toBeLessThanOrEqual(0.1);
  const geometry = await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.renderer3d,
      targetVector = r.target.clone();
    const direction = r.camera.getWorldDirection(targetVector);
    const screen = r.project(1100, 900, 28),
      target = r.screenToWorld(screen.x, screen.y);
    return {
      angle:
        (Math.atan2(
          Math.abs(direction.y),
          Math.hypot(direction.x, direction.z),
        ) *
          180) /
        Math.PI,
      target,
      joined: r.villageStage.userData.buildings.every(
        (entry: any) =>
          entry.group.children.some((m: any) => m.name === "floor") &&
          entry.group.children.some(
            (m: any) =>
              !!m.material.map &&
              !!m.geometry.attributes.uv &&
              !!m.geometry.attributes.normal,
          ),
      ),
    };
  });
  expect(geometry.angle).toBeCloseTo(33, 3);
  expect(geometry.target.x).toBeCloseTo(1100, 3);
  expect(geometry.target.y).toBeCloseTo(876, 3);
  expect(geometry.joined).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-33-degree-wall-occlusion.png",
  });
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.p.x = 1000;
    g.raid.p.y = 820;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const entry = (
          window as any
        ).__game.renderer3d.villageStage.userData.buildings.find(
          (b: any) => b.id === "clinic",
        );
        return entry.group.children.find((m: any) => m.name === "roof").material
          .opacity;
      }),
    )
    .toBe(1);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      d = await import("/src/data.ts"),
      c = r.containers[0];
    c.items = [d.makeItem("c4_0")];
    c.revealed = 0;
    c.locked = false;
    r.p.x = c.x - 25;
    r.p.y = c.y;
    r.paused = false;
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByRole("region", { name: "右侧容器" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.raid.searchProgress))
    .toBeGreaterThan(0.3);
  const progress = await page.evaluate(() => {
    const r = (window as any).__game.raid,
      p = r.searchProgress;
    r.addBullet(r.p.x - 70, r.p.y - 25, 0, false, 10, 1);
    return p;
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.raid.p.hp))
    .toBeLessThan(100);
  expect(
    await page.evaluate(() => (window as any).__game.raid.searchProgress),
  ).toBeGreaterThanOrEqual(progress);
  await expect(page.getByRole("region", { name: "右侧容器" })).toBeVisible();
  await page.screenshot({
    path: "test-results/chrome-hit-keeps-searching.png",
  });
  await expect(page.locator('.loot-panel [data-item="c4_0"]')).toBeVisible({
    timeout: 15000,
  });
  await page.locator('.loot-panel [data-item="c4_0"]').dblclick();
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.pack.some((i: any) => i.id === "c4_0"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
