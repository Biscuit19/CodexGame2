import { test, expect, type Page } from "@playwright/test";

async function enter(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.waitForFunction(
    () => (window as any).__game.renderer3d.villageStage?.userData.assetsReady,
  );
  await page.evaluate(() => {
    (window as any).__game.raid.enemies = [];
  });
}

test("扩图后完整素材、三座桥实走、不同朝向门洞、进屋搜索与三秒撤离", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await enter(page);
  const models = await page.evaluate(() => {
    const g = (window as any).__game;
    return {
      size: [g.raid.width, g.raid.height],
      texture: [g.renderer.ground.width, g.renderer.ground.height],
      buildings: g.renderer3d.villageStage.userData.buildings.map((b: any) => ({
        vertices: b.group.children.reduce(
          (n: number, m: any) => n + m.geometry.attributes.position.count,
          0,
        ),
        textured: b.group.children.some(
          (m: any) =>
            !!m.material.map &&
            !!m.geometry.attributes.uv &&
            !!m.geometry.attributes.normal,
        ),
        parts: [...new Set(b.group.children.map((m: any) => m.name))].sort(),
      })),
    };
  });
  expect(models.size).toEqual([13000, 10000]);
  expect(Math.max(...models.texture)).toBeLessThanOrEqual(4096);
  expect(models.buildings).toHaveLength(6);
  for (const b of models.buildings) {
    expect(b.vertices).toBeGreaterThan(3000);
    expect(b.textured).toBe(true);
    expect(b.parts).toEqual(["body", "floor", "roof"]);
  }
  const bridges = await page.evaluate(async () => {
    const v = await import("/src/village.ts" as string);
    return v.villageBridges;
  });
  for (const b of bridges) {
    const axis = b.rotation ? "x" : "y",
      half = (b.rotation ? b.w : b.h) / 2;
    await page.evaluate(
      ({ b, axis, half }) => {
        const r = (window as any).__game.raid;
        r.p.x = b.x;
        r.p.y = b.y;
        r.p[axis] += half + 35;
        r.p.stamina = 100;
      },
      { b, axis, half },
    );
    const key = b.rotation ? "KeyA" : "KeyW",
      target = b[axis] - half - 10;
    await page.keyboard.down(key);
    try {
      await expect
        .poll(
          () =>
            page.evaluate(({ axis }) => (window as any).__game.raid.p[axis], {
              axis,
            }),
          { timeout: 18000, intervals: [60] },
        )
        .toBeLessThan(target);
    } finally {
      await page.keyboard.up(key);
    }
  }
  // Visually verify deck/feet at the actual y=0 playing plane, without bridge normalization.
  await page.evaluate(
    ({ b }) => {
      const g = (window as any).__game;
      g.raid.p.x = b.x;
      g.raid.p.y = b.y;
    },
    { b: bridges[2] },
  );
  await page.waitForTimeout(150);
  expect(
    await page.evaluate(() => {
      const s = (window as any).__game.renderer3d.villageStage;
      return s.children
        .filter((c: any) => c.name.startsWith("village-bridge-"))
        .every(
          (c: any) =>
            c.position.y === 0 &&
            c.scale.y === 1 &&
            c.userData.deckHeight === 0,
        );
    }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/village-bridge-feet.png" });
  // Each source doorway is walked through using the building's real rotated local axis.
  for (const id of ["hunter", "clinic", "shop", "home", "barn", "boss"]) {
    const data = await page.evaluate(async (id) => {
      const g = (window as any).__game,
        v = await import("/src/village.ts" as string),
        b = v.villageBuildings.find((b: any) => b.id === id)!;
      Object.assign(g.raid.p, v.buildingWorld(b, b.doorOffset, b.h / 2 + 65));
      g.raid.p.stamina = 100;
      return { x: -Math.sin(b.rotation), y: Math.cos(b.rotation) };
    }, id);
    const keys = [
      Math.abs(data.x) > 0.4 ? (data.x > 0 ? "KeyA" : "KeyD") : null,
      Math.abs(data.y) > 0.4 ? "KeyW" : null,
    ].filter(Boolean) as string[];
    for (const key of keys) await page.keyboard.down(key);
    try {
      await expect
        .poll(
          () =>
            page.evaluate(async (id) => {
              const g = (window as any).__game,
                v = await import("/src/village.ts" as string),
                b = v.villageBuildings.find((b: any) => b.id === id)!;
              return v.buildingLocal(b, g.raid.p.x, g.raid.p.y).y - b.h / 2;
            }, id),
          { timeout: 4000, intervals: [50] },
        )
        .toBeLessThan(-45);
    } finally {
      for (const key of keys) await page.keyboard.up(key);
    }
    const opacity = await page.evaluate((id) => {
      const b = (
        window as any
      ).__game.renderer3d.villageStage.userData.buildings.find(
        (b: any) => b.id === id,
      );
      return b.group.children.map((m: any) => ({
        name: m.name,
        opacity: m.material.opacity,
      }));
    }, id);
    for (const part of opacity)
      expect(part.opacity).toBe(
        part.name === "floor" ? 1 : part.name === "roof" ? 0.008 : 0.01,
      );
  }
  await page.evaluate(() => {
    const r = (window as any).__game.raid,
      c = r.containers.find(
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
  await page.evaluate(() => {
    const r = (window as any).__game.raid,
      e = r.exits[0];
    r.p.x = e.x;
    r.p.y = e.y;
    r.extract = 0;
  });
  const result = page.locator("#result-dialog");
  await expect(result).toBeVisible({ timeout: 6000 });
  expect(await result.evaluate((el) => el.matches(":modal"))).toBe(true);
  await expect(
    result.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/village-extraction.png" });
  await result.locator("button").click();
  await expect(page.locator(".base-tile")).toHaveCount(5);
  expect(errors).toEqual([]);
});

test("Chrome 大地图顶层可见、M与Esc和按钮关闭，局部小地图跟随玩家", async ({
  page,
}) => {
  test.setTimeout(60000);
  await enter(page);
  const mini = page.locator("#minimap");
  const oldView = await mini.getAttribute("data-view-x");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 10000;
    r.p.y = 5000;
  });
  await expect.poll(() => mini.getAttribute("data-view-x")).not.toBe(oldView);
  expect(Number(await mini.getAttribute("data-view-width"))).toBe(2600);
  for (const [width, height] of [
    [1440, 1000],
    [1366, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.keyboard.press("KeyM");
    const dialog = page.locator("#map-dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
    expect(
      Number(await dialog.locator("canvas").getAttribute("data-view-width")),
    ).toBe(13000);
    await page.screenshot({
      path: `test-results/chrome-village-map-${width}.png`,
    });
    await page.keyboard.press("KeyM");
    await expect(dialog).not.toBeVisible();
    await page.keyboard.press("KeyM");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await page.keyboard.press("KeyM");
    await dialog.getByRole("button", { name: "关闭地图（M / Esc）" }).click();
    await expect(dialog).not.toBeVisible();
  }
});
