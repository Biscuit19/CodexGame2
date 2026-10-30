import { test, expect } from "@playwright/test";
test("地图高对比玩家标记、高资源圈及敌人名字和技能预警实际可见", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    const r = g.raid;
    r.enemies.forEach((e: any) => (e.cool = 100));
  });
  await page.keyboard.press("m");
  const map = page.locator("#full-map");
  await expect(map).toBeVisible();
  const color = await map.evaluate((canvas: HTMLCanvasElement) => {
    const r = (window as any).__game.raid,
      c = canvas.getContext("2d")!;
    const x = Math.round((r.p.x / r.width) * canvas.width),
      y = Math.round((r.p.y / r.height) * canvas.height);
    return [...c.getImageData(x, y, 1, 1).data];
  });
  expect(color.slice(0, 3)).toEqual([255, 46, 134]);
  await page.screenshot({ path: "test-results/tactics-map.png" });
  await page.keyboard.press("m");
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid,
      boss = r.enemies.find((e: any) => e.boss);
    r.enemies = [boss];
    r.p.x = boss.x - 250;
    r.p.y = boss.y + 120;
    boss.state = "combat";
    boss.cool = 100;
    boss.tacticCool = 0;
    r.updateVillageTactics(boss, 0.016, true);
    // Hold the actual active warning while checking canvas output.
    boss.maneuver.time = 20;
  });
  await page.waitForTimeout(400);
  const warning = await page.evaluate(() => {
    const g = (window as any).__game,
      b = g.raid.enemies[0];
    return {
      kind: b.maneuver?.kind,
      stage: b.maneuver?.stage,
      point: g.renderer3d.project(b.x, b.y, 133),
    };
  });
  expect(warning.kind).toBe("boss-fan");
  expect(warning.stage).toBe("warn");
  await page.screenshot({ path: "test-results/tactics-boss-warning.png" });
  // Native menus continue to work over the canvas; use Esc to close.
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).not.toBeVisible();
});
