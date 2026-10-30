import { test, expect } from "@playwright/test";
test("基地和战区第一首即随机，用户可切回循环", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.9999;
  });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.sound.currentMusic))
    .toBe("PM20");
  expect(
    await page.evaluate(
      () => (window as any).__game.save.settings.baseMusicMode,
    ),
  ).toBe("random");
  await page.evaluate(() => (window as any).__game.deploy(true));
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.sound.currentMusic))
    .toBe("PM12");
  await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.settings.musicMode = "loop";
    s.settings.musicTrack = "BG5";
    s.apply();
  });
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("BG5");
});
test("扩容确认、取消、Esc不扣钱，确认显示新容量，一键配装及状态栏实际可见", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    const s = structuredClone(g.save);
    s.warehouse = 0;
    s.coins = 10000;
    g.setSave(s);
  });
  await page.getByRole("button", { name: /仓库与整备/ }).click();
  const before = await page.evaluate(() => (window as any).__game.save.coins);
  await page.getByRole("button", { name: /扩容 ◈/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("60 格扩容到 80 格");
  await page.screenshot({
    path: "test-results/warehouse-expansion-confirm.png",
  });
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    before,
  );
  await page.getByRole("button", { name: /扩容 ◈/ }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: /扩容 ◈/ }).click();
  await dialog.getByRole("button", { name: "确认扩容", exact: true }).click();
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    before - 8000,
  );
  expect(await page.evaluate(() => (window as any).__game.save.warehouse)).toBe(
    1,
  );
  await page.getByRole("button", { name: "一键配装", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    g.raid.enemies = [];
    g.raid.p.hp = 25;
    g.raid.p.stamina = 36;
  });
  await expect(page.getByLabel("生命与体力")).toBeVisible();
  await expect(page.locator(".vitals")).toHaveClass(/low-health/);
  await expect(page.locator("#hp-number")).toHaveText("25");
  await page.screenshot({ path: "test-results/soft-vitals-hud.png" });
  const bounds = await page.locator(".vitals").boundingBox();
  expect(bounds!.width).toBeLessThan(340);
  expect(bounds!.height).toBeLessThan(230);
});
