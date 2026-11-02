import { test, expect, type Page } from "@playwright/test";
async function enter(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    g.raid.enemies = g.raid.enemies.filter((e: any) => e.boss);
    g.raid.enemies.forEach((e: any) => {
      e.turret = true;
      e.cool = 999;
      e.tacticCool = 999;
    });
  });
}
test("地图显示保险箱及三种图例，Boss首字号与名字一致，关闭键正常", async ({
  page,
}) => {
  await enter(page);
  await page.keyboard.press("m");
  await expect(page.locator("#map-dialog")).toBeVisible();
  const data = await page.evaluate(async () => {
    const g = (window as any).__game;
    const m = await import("/src/village-map.ts" as string);
    const c = document.querySelector("#full-map") as HTMLCanvasElement;
    const ctx = c.getContext("2d")!;
    const texts: { t: string; font: string }[] = [];
    const orig = ctx.fillText;
    ctx.fillText = function (t: string, ...args: any[]) {
      texts.push({ t, font: this.font });
      return orig.call(this, t, ...(args as [number, number]));
    };
    m.drawVillageMap(c, g.raid, true);
    ctx.fillText = orig;
    return {
      texts,
      safeCount: c.dataset.safeCount,
      actual: g.raid.containers.filter((c: any) => c.type === "safe").length,
    };
  });
  expect(Number(data.safeCount)).toBe(data.actual);
  expect(data.actual).toBeGreaterThanOrEqual(2);
  for (const t of ["保险箱", "高资源区", "首领", "麦田东侧 C"])
    expect(data.texts.some((x) => x.t === t)).toBe(true);
  expect(data.texts.some((x) => x.t === "首" && x.font.includes("36px"))).toBe(
    true,
  );
  await page.screenshot({ path: "test-results/resource-safe-map.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#map-dialog")).not.toBeVisible();
});
test("真实诊所保险箱能解锁搜索，缺弹反复触发只刷新一条红色提示，奖励主题一致", async ({
  page,
}) => {
  await enter(page);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    const c = r.containers.find(
      (c: any) => c.region === "clinic" && c.type === "safe",
    );
    r.p.x = c.x;
    r.p.y = c.y;
    r.containers = r.containers.filter(
      (c: any) =>
        c ===
          r.containers.find(
            (x: any) => x.region === "clinic" && x.type === "safe",
          ) || Math.hypot(c.x - r.p.x, c.y - r.p.y) > 100,
    );
  });
  await page.keyboard.press("e");
  await expect(page.locator(".puzzle-panel")).toBeVisible();
  const answer = await page.evaluate(
    () => (window as any).__game.raid.puzzle.answer,
  );
  await page.locator(`.math-choices [data-id="${answer}"]`).click();
  await expect(page.locator(".loot-panel")).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__game.raid.search.locked),
  ).toBe(false);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.save.equipment.ammo = null;
    r.save.pack = r.save.pack.filter((i: any) => !i.id.startsWith("m"));
    r.mag = 0;
    for (let n = 0; n < 40; n++) r.loadMagazine();
  });
  await expect(page.locator("#toasts .toast")).toHaveCount(1);
  await expect(page.locator("#toasts .toast")).toHaveText("无备弹 · 切换弹药");
  await expect(page.locator("#toasts .toast")).toHaveClass(/notice-danger/);
  const shape = await page.locator("#toasts .toast").evaluate((e) => {
    const s = getComputedStyle(e);
    return {
      radius: s.borderRadius,
      border: s.borderTopWidth,
      font: s.fontSize,
    };
  });
  expect(shape).toEqual({ radius: "13px", border: "4px", font: "34px" });
  await page.screenshot({ path: "test-results/compact-danger-notice.png" });
  await page.waitForTimeout(1800);
  await page.evaluate(() => (window as any).__game.raid.loadMagazine());
  await page.waitForTimeout(1900);
  await expect(page.locator("#toasts .toast")).toHaveCount(1);
  await page.evaluate(() =>
    (window as any).__game.raid.notify("击败 铁腮 · 成功撤离以保存进度"),
  );
  await expect(page.locator("#toasts .toast")).toHaveClass(/notice-reward/);
  await expect(page.locator("#toasts .toast")).toHaveCount(1);
  await page.screenshot({ path: "test-results/boss-reward-notice.png" });
});
for (const name of ["农庄内院 B", "麦田东侧 C"])
  test(`新位置${name}实际倒计时撤离并返回基地`, async ({ page }) => {
    await enter(page);
    await page.evaluate((name) => {
      const r = (window as any).__game.raid;
      r.enemies = [];
      const e = r.exits.find((e: any) => e.name === name);
      r.p.x = e.x;
      r.p.y = e.y;
    }, name);
    await expect(page.getByRole("button", { name: /返回基地/ })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: /返回基地/ }).click();
    await expect(
      page.getByRole("heading", { name: "暖窝基地", exact: true }),
    ).toBeVisible();
  });
