import { test, expect } from "@playwright/test";
test("基地、整备、真实移动与搜索、撤离、刷新存档", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test=1");
  await expect(
    page.getByRole("heading", { name: "搜一点，打一场，带回家。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "明白了，回到基地" }).click();
  await expect(
    page.getByRole("heading", { name: "欢迎回到暖窝。" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home.png", fullPage: true });
  await page.getByRole("button", { name: "仓库与整备" }).first().click();
  await expect(page.getByRole("heading", { name: "仓库与整备" })).toBeVisible();
  await page
    .locator('[data-from="stash"][data-action="select"]')
    .first()
    .click();
  await page.getByRole("button", { name: "放入出战背包", exact: true }).click();
  await page.getByRole("button", { name: "战区地图" }).click();
  await page.getByRole("button", { name: "开始行动" }).click();
  await expect(page.locator("#raid-time")).toContainText("14:");
  await page.screenshot({ path: "test-results/raid.png" });
  const before = await page.evaluate(() => (window as any).__game.raid.p.x);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(300);
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => (window as any).__game.raid.p.x),
  ).toBeGreaterThan(before + 15);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    const c = r.containers[0];
    r.p.x = c.x - 25;
    r.p.y = c.y;
    r.enemies = [];
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator(".loot-panel")).toBeVisible();
  await page.waitForTimeout(3000);
  await page.locator('[data-action="take-all"]').click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyM");
  await expect(page.locator("#full-map")).toBeVisible();
  await page.keyboard.press("KeyM");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = r.exits[0].x;
    r.p.y = r.exits[0].y;
  });
  await expect(page.getByRole("heading", { name: "平安归巢" })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "返回暖窝" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "欢迎回到暖窝。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__game.save.stats.extracts),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("真实瞄准射击、换弹、翻滚后继续射击与暂停", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "明白了，回到基地" }).click();
  await page.getByRole("button", { name: "战区地图" }).click();
  await page.getByRole("button", { name: "开始行动" }).click();
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.p.x = 1000;
    r.p.y = 1000;
    r.spawn(1150, 1000, 0, 1).cool = 100;
  });
  await page.waitForTimeout(200);
  const point = await page.evaluate(() => {
    const g = (window as any).__game;
    return {
      x: (1150 - g.renderer.camera.x) * g.renderer.scale,
      y: (975 - g.renderer.camera.y) * g.renderer.scale,
    };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__game.raid.stats.kills),
  ).toBe(1);
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(1800);
  expect(await page.evaluate(() => (window as any).__game.raid.mag)).toBe(30);
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__game.raid.mag),
  ).toBeLessThan(30);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "行动暂停" })).toBeVisible();
  const paused = await page.evaluate(() => (window as any).__game.raid.time);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__game.raid.time)).toBe(
    paused,
  );
  await page.getByRole("button", { name: "继续行动" }).click();
});

test("双击装备、购买、安全箱、三存档槽和导出", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "明白了，回到基地" }).click();
  await page.getByRole("button", { name: "仓库与整备" }).first().click();
  await page
    .locator('[data-from="stash"].item-card')
    .filter({ hasText: "猫爪 56" })
    .dblclick();
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.primary.id),
  ).toBe("w3");
  await page.getByRole("button", { name: "补给商店" }).first().click();
  const before = await page.evaluate(() => (window as any).__game.save.coins);
  await page.locator('[data-action="buy"][data-id="w0"]').click();
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    before - 900,
  );
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.coins = 50000;
  });
  await page.getByRole("button", { name: "仓库与整备" }).first().click();
  await page.getByRole("button", { name: "升级安全箱" }).click();
  await page.locator('[data-action="safe"][data-id="2"]').click();
  expect(await page.evaluate(() => (window as any).__game.save.safe)).toBe(2);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出当前存档" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("存档1");
  await page.locator('[data-action="slot"][data-id="1"]').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.save.slot))
    .toBe(1);
  expect(await page.evaluate(() => (window as any).__game.save.safe)).toBe(0);
  await page.locator('[data-action="slot"][data-id="0"]').click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.save.safe))
    .toBe(2);
  await page.screenshot({ path: "test-results/settings.png", fullPage: true });
});

test("最终关密钥跨局保存、博士门槛、完成主线和新周目", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "明白了，回到基地" }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.defeated = ["iron", "swift", "yeed"];
    g.selectMap(3);
    g.deploy();
  });
  expect(
    await page.evaluate(() =>
      (window as any).__game.raid.enemies
        .filter((e: any) => e.boss)
        .map((e: any) => e.id),
    ),
  ).toEqual(["maine", "frost"]);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    for (const e of [...r.enemies]) if (e.boss) r.kill(e);
    r.enemies = [];
    r.finish(true, "密钥带回测试");
  });
  await expect(page.getByRole("heading", { name: "平安归巢" })).toBeVisible();
  await page.getByRole("button", { name: "返回暖窝" }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.selectMap(3);
    g.deploy();
  });
  expect(
    await page.evaluate(() =>
      (window as any).__game.raid.enemies
        .filter((e: any) => e.boss)
        .map((e: any) => e.id),
    ),
  ).toContain("doctor");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    const boss = r.enemies.find((e: any) => e.id === "doctor");
    r.p.x = boss.x - 170;
    r.p.y = boss.y + 50;
    r.enemies = [boss];
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/final-boss.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.kill(r.enemies[0]);
    r.finish(true, "猫晶核心带回测试");
  });
  await expect(
    page.getByRole("heading", { name: "行动完成 · 猫晶归巢" }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__game.save.completed)).toBe(
    true,
  );
  await page.getByRole("button", { name: "返回暖窝" }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "开启九命周目" }).click();
  await page.getByRole("button", { name: "开始新周目" }).click();
  expect(await page.evaluate(() => (window as any).__game.save.ng)).toBe(1);
  expect(
    await page.evaluate(() => (window as any).__game.save.defeated.length),
  ).toBe(0);
});
