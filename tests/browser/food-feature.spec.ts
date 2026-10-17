import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
}
async function deploy(page: Page) {
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() => ((window as any).__game.raid.enemies = []));
}
test("发现提示图文顺序、字号与四字文案正确，更稀有提示覆盖后不重播旧提示", async ({
  page,
}) => {
  await start(page);
  await deploy(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const [id, headline] of [
    ["c0_1", "捡到宝了！"],
    ["c0_6", "捡到宝了！"],
    ["c2_4", "金色传说！"],
    ["c4_0", "天降横财！"],
  ]) {
    await page.evaluate(
      async (id) =>
        (window as any).__game.raid.discover(
          (await import("/src/data.ts")).makeItem(id),
        ),
      id,
    );
    const banner = page.locator(".discovery-card");
    await expect(banner).toHaveAttribute("data-item", id);
    await expect(banner.locator(".discovery-headline")).toHaveText(headline);
    await expect(banner.locator(".discovery-unlock")).toHaveText("解锁");
    await expect(banner.locator(`[data-art="${id}"]`)).toBeVisible();
    await page.clock.runFor(100);
  }
  await page.clock.runFor(300);
  const geometry = await page.locator(".discovery-card").evaluate((el) => {
    const nodes = [
      ".discovery-intro",
      ".discovery-name",
      ".item-art",
      ".discovery-description",
    ].map((q) => el.querySelector(q)!);
    return nodes.map((n) => ({
      size: parseFloat(getComputedStyle(n).fontSize),
      x: n.getBoundingClientRect().x,
      y: n.getBoundingClientRect().y,
      bottom: n.getBoundingClientRect().bottom,
    }));
  });
  expect(geometry[0].size).toBeLessThan(geometry[3].size);
  expect(geometry[3].size).toBeLessThan(geometry[1].size);
  expect(geometry[0].x).toBeLessThan(geometry[1].x);
  expect(geometry[1].x).toBeLessThan(geometry[2].x);
  expect(geometry[3].y).toBeGreaterThanOrEqual(
    Math.max(...geometry.slice(0, 3).map((n) => n.bottom)),
  );
  await page.screenshot({
    path: "test-results/chrome-discovery-new-layout.png",
  });
  await page.clock.fastForward(7100);
  await expect(page.locator(".discovery-card")).toHaveCount(0);
});
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 1366, height: 768 },
]) {
  test(`自动食物装备、战斗图标与完整安全箱格可见 ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await start(page);
    await page.evaluate(async () => {
      const g = (window as any).__game,
        d = await import("/src/data.ts");
      g.save.pack = [
        d.makeItem("f3"),
        d.makeItem("f2"),
        d.makeItem("f1", 2),
        d.makeItem("c1_9"),
      ];
      g.save.equipment.food = null;
      g.save.safe = 3;
      g.save.secure = [d.makeItem("c4_1"), d.makeItem("c4_6")];
    });
    await deploy(page);
    await expect(page.locator("#food-name")).toHaveText("小鱼干");
    await expect(page.locator('#food-art [data-art="f1"]')).toBeVisible();
    const health = await page.locator(".vitals").boundingBox(),
      food = await page.locator(".food-hud").boundingBox();
    expect(food!.x).toBeGreaterThan(health!.x + health!.width);
    await page.keyboard.press("Tab");
    await expect(
      page.locator('[data-slot="food"] .equipped-item'),
    ).toHaveAttribute("data-item", "f1");
    const safe = await page
        .locator(".safe-grid .item-slot")
        .first()
        .boundingBox(),
      pack = await page.locator(".pack-grid .item-slot").first().boundingBox();
    expect(Math.abs(safe!.width - pack!.width)).toBeLessThan(1);
    expect(Math.abs(safe!.height - pack!.height)).toBeLessThan(1);
    await expect(
      page.locator('.safe-grid [data-item="c4_1"] strong'),
    ).toHaveText("薛定谔的猫匣");
    const font = await page
      .locator(".safe-label strong")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(font).toBeGreaterThanOrEqual(24);
    await expect(page.locator(".safe-label")).toContainText("2/6 格");
    expect(
      (await page.locator(".safe-fixed").boundingBox())!.y +
        (await page.locator(".safe-fixed").boundingBox())!.height,
    ).toBeLessThan(viewport.height);
    const rowTops = await page
      .locator(".safe-grid > *")
      .evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().top)),
      );
    expect(new Set(rowTops).size).toBe(1);
    await page.screenshot({
      path: `test-results/chrome-food-slot-and-safe-${viewport.width}.png`,
    });
    await page.keyboard.press("Tab");
    if (viewport.width === 1440) {
      for (const [id, qty] of [
        ["f1", 1],
        ["c1_9", 1],
        ["f2", 1],
        ["f3", 1],
        [null, 0],
      ] as const) {
        await page.evaluate(() => ((window as any).__game.raid.p.hp = 1));
        await page.keyboard.press("KeyF");
        await expect
          .poll(() =>
            page.evaluate(() => {
              const f = (window as any).__game.save.equipment.food;
              return [f?.id ?? null, f?.qty ?? 0];
            }),
          )
          .toEqual([id, qty]);
      }
      await expect(page.locator("#food-name")).toHaveText("没有食物");
    }
  });
}
test("收藏保持70件且无饮食造型，旧餐盒转补给并迁移图鉴，替换物使用新PNG", async ({
  page,
}) => {
  await start(page);
  const content = await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      a = await import("/src/equipment-art.ts"),
      s = await import("/src/store.ts");
    const old = s.newSave();
    old.collection = ["c4_8", "c4_0"];
    old.pack = [d.makeItem("c4_8")];
    delete old.equipment.food;
    const migrated = s.validateSave(old);
    const renamed = [
      "c0_2",
      "c0_3",
      "c0_4",
      "c0_7",
      "c0_11",
      "c1_0",
      "c1_2",
      "c1_11",
      "c2_0",
      "c3_0",
      "c3_3",
      "c3_8",
      "c4_1",
      "c4_6",
      "c5_11",
      "c6_0",
    ];
    return {
      names: d.collectibles.map((i) => i.name),
      foods: d.foods.length,
      box: d.db.c4_8.kind,
      collection: migrated.collection,
      food: migrated.equipment.food,
      urls: renamed.map((id) => a.equipmentFrame(id)?.url),
      effects: d.foods.map((i) => ({
        id: i.id,
        tier: i.tier,
        heal: i.heal,
        over: i.healOverTime,
      })),
    };
  });
  expect(content.names).toHaveLength(70);
  expect(content.names.join(" ")).not.toMatch(
    /番茄|辣条|夹心饼|牛奶|可乐|猫粮|香料|纸杯|恶喵果|开罐圣剑|猫罐|餐盒|随行瓶|外卖袋|漏勺|老干/,
  );
  expect(content.foods).toBe(10);
  expect(content.box).toBe("food");
  expect(content.collection).toEqual(["c4_0"]);
  expect(content.food).toBeNull();
  expect(
    content.urls.every((url) => url?.includes("collectibles-household.png")),
  ).toBe(true);
  for (const supply of content.effects.filter((i) => i.over && !i.heal)) {
    const instant = content.effects
      .filter((i) => i.tier === supply.tier && !i.over)
      .map((i) => i.heal!);
    expect(supply.over!).toBeGreaterThan(Math.max(...instant) * 1.4);
  }
});
