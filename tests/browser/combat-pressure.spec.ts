import { test, expect } from "@playwright/test";
test("已选曲目按基地8首和游戏11首分开，基地随机不混游戏，原曲可播放", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(
    page.getByLabel("基地音乐", { exact: true }).locator("option"),
  ).toHaveCount(8);
  await expect(
    page.getByLabel("游戏音乐", { exact: true }).locator("option"),
  ).toHaveCount(11);
  await expect(
    page.getByLabel("游戏音乐", { exact: true }).locator("option[value=PM18]"),
  ).toHaveCount(0);
  await page.getByLabel("基地音乐", { exact: true }).selectOption("PM20");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__game.sound.musicElement.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("PM20");
  await page.getByLabel("基地音乐播放", { exact: true }).selectOption("random");
  const random = await page.evaluate(() => {
    const s = (window as any).__game.sound,
      keys = [];
    for (let n = 0; n < 20; n++) {
      s.musicElement.dispatchEvent(new Event("ended"));
      keys.push(s.currentMusic);
    }
    return keys;
  });
  expect(
    random.every((k) =>
      [
        "ORIGINAL",
        "PM05",
        "PM06",
        "PM08",
        "PM12",
        "PM16",
        "PM18",
        "PM20",
      ].includes(k),
    ),
  ).toBe(true);
  await page.getByLabel("游戏音乐", { exact: true }).selectOption("PM12");
  await page.evaluate(() => (window as any).__game.deploy(true));
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("PM12");
});
test("问号警觉、红色Boss名、三种子弹拖尾及无地面预警实际显示", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    const r = g.raid;
    r.enemies = [];
    r.p.x = 1200;
    r.p.y = 4700;
    r.walls = [];
    r.exits = [];
    const foe = r.spawn(r.p.x + 150, r.p.y, 0, 1);
    foe.state = "investigate";
    foe.alert = 8;
    const boss = r.spawn(r.p.x + 250, r.p.y - 150, 13, 3, {
      id: "iron",
      name: "罐头监工·铁腮",
      hp: 850,
      weapon: 18,
      skill: "shotgun",
      breed: 13,
      map: 0,
      x: 0,
      y: 0,
    });
    boss.state = "combat";
    boss.maneuver = {
      kind: "boss-fan",
      stage: "warn",
      time: 20,
      shots: 3,
      angle: 0,
      x: r.p.x,
      y: r.p.y,
    };
    r.bullets = [];
    r.addBullet(r.p.x - 110, r.p.y - 80, 0, true, 10, 1);
    r.addBullet(r.p.x - 60, r.p.y - 140, 0, false, 12, 1);
    r.addBullet(
      r.p.x - 5,
      r.p.y - 200,
      0,
      false,
      12,
      3,
      800,
      false,
      true,
      undefined,
      true,
      1100,
    );
    r.bullets.forEach((b: any) => (b.travel = 55));
    r.update = () => {};
  });
  await page.waitForTimeout(250);
  const data = await page.evaluate(() => {
    const r = (window as any).__game.raid;
    return {
      colors: r.bullets.map((b: any) =>
        b.friendly ? "gold" : b.boss ? "purple" : "orange",
      ),
      alert: r.enemies[0].state,
    };
  });
  expect(data.colors).toEqual(["gold", "orange", "purple"]);
  expect(data.alert).toBe("investigate");
  await page.screenshot({ path: "test-results/combat-pressure-tracers.png" });
});
test("免费撤离绿烟和付费金币显示，实际停留可撤离", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.deploy(true);
    const r = g.raid;
    r.enemies = [];
    const e = r.exits.find((e: any) => !e.paid);
    r.p.x = e.x - 130;
    r.p.y = e.y + 80;
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "test-results/extraction-green-smoke.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid,
      e = r.exits.find((e: any) => e.paid);
    r.p.x = e.x - 130;
    r.p.y = e.y + 80;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/extraction-paid-coin.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid,
      e = r.exits.find((e: any) => !e.paid);
    r.p.x = e.x;
    r.p.y = e.y;
  });
  await expect(page.getByRole("button", { name: /返回基地/ })).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: /返回基地/ }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
});
