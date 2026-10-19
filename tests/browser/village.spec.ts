import { test, expect } from "@playwright/test";

test("猫尾乡野完整素材、河流阻隔与三座桥实走、进屋搜索及三秒撤离", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.waitForFunction(
    () => (window as any).__game.renderer3d.villageStage?.userData.assetsReady,
  );
  const models = await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    return g.renderer3d.villageStage.userData.buildings.map((b: any) => ({
      id: b.id,
      vertices: b.group.children.reduce(
        (n: number, m: any) => n + m.geometry.attributes.position.count,
        0,
      ),
      parts: b.group.children.map((m: any) => m.name).sort(),
    }));
  });
  expect(models.map((m: any) => m.id).sort()).toEqual([
    "barn",
    "boss",
    "clinic",
    "home",
    "hunter",
    "shop",
  ]);
  for (const model of models) {
    expect(model.vertices).toBeGreaterThan(500);
    expect(model.parts).toEqual(["body", "roof"]);
  }
  // Start fixtures on one bank; cross each actual bridge with real keyboard movement.
  for (const [x, y, key, target, axis] of [
    [260, 1200, "KeyW", 900, "y"],
    [480, 830, "KeyD", 790, "x"],
    [1460, 1550, "KeyW", 1250, "y"],
  ] as const) {
    await page.evaluate(
      ({ x, y }) => {
        const r = (window as any).__game.raid;
        r.p.x = x;
        r.p.y = y;
      },
      { x, y },
    );
    await page.keyboard.down(key);
    await expect
      .poll(
        () =>
          page.evaluate(
            ({ axis, target }) =>
              Math.abs((window as any).__game.raid.p[axis] - target),
            { axis, target },
          ),
        { timeout: 7000, intervals: [50] },
      )
      .toBeLessThan(35);
    await page.keyboard.up(key);
  }
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 900;
    r.p.y = 1500;
  });
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1700);
  await page.keyboard.up("KeyW");
  const blockedY = await page.evaluate(() => (window as any).__game.raid.p.y);
  expect(blockedY).toBeGreaterThan(1270);
  expect(blockedY).toBeLessThan(1500);
  await page.screenshot({ path: "test-results/village-river-barrier.png" });
  // Walk through the real clinic doorway; roof/body fade leaves resources visible.
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 1300;
    r.p.y = 715;
  });
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.raid.p.y), {
      intervals: [40],
    })
    .toBeLessThan(610);
  await page.keyboard.up("KeyW");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    const c = r.containers.find(
      (c: any) => c.region === "clinic" && c.type === "medical",
    );
    r.p.x = c.x;
    r.p.y = c.y + 20;
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByRole("region", { name: "右侧容器" })).toBeVisible();
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  await page.screenshot({
    path: "test-results/village-clinic-interior-search.png",
  });
  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("region", { name: "右侧容器" }),
  ).not.toBeVisible();
  // A is accessible without any boss kill, and uses the existing three-second rule.
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 1580;
    r.p.y = 1050;
    r.extract = 0;
  });
  await page.keyboard.down("KeyW");
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.raid.p.y), {
      intervals: [40],
    })
    .toBeLessThan(965);
  await page.keyboard.up("KeyW");
  const result = page.locator("#result-dialog");
  await expect(result).not.toBeVisible();
  await expect(result).toBeVisible({ timeout: 6000 });
  await expect(
    result.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible();
  expect(await result.evaluate((el) => el.matches(":modal"))).toBe(true);
  await page.screenshot({ path: "test-results/village-extraction.png" });
  await result.locator("button").click();
  await expect(page.locator(".base-tile")).toHaveCount(5);
  expect(errors).toEqual([]);
});
