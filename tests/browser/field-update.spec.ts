import { acceptPreflightIfPresent } from "./helpers/deploy";
import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
}
async function deploy(page: Page) {
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await acceptPreflightIfPresent(page);
  await page.evaluate(() => {
    (window as any).__game.raid.enemies = [];
  });
}
test("物品悬停只保留小字食物分类，整理背包与批量出售确认在Chrome可用", async ({
  page,
}) => {
  await start(page);
  const ids = await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.pack = ["w3", "f2", "b2", "m1", "c3_0"].map((id) => d.makeItem(id));
    const cs = [1, 2, 3, 4, 5].map((t) =>
      d.makeItem(
        Object.values(d.db).find(
          (i: any) => i.kind === "collectible" && i.tier === t,
        )!.id,
      ),
    );
    g.save.stash = [...cs, d.makeItem("f1")];
    return cs.map((i) => i.uid);
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator(".pack-grid [data-item=w3]").hover();
  await expect(page.locator("#item-tooltip")).toBeVisible();
  await expect(
    page.locator("#item-tooltip .item-kind,#item-tooltip .food-category"),
  ).toHaveCount(0);
  await page.locator(".pack-grid [data-item=f2]").hover();
  await expect(page.locator("#item-tooltip .food-category")).toHaveText("食物");
  const sizes = await page
    .locator("#item-tooltip")
    .evaluate((el) => [
      getComputedStyle(el.querySelector("strong")!).fontSize,
      getComputedStyle(el.querySelector(".food-category")!).fontSize,
    ]);
  expect(parseFloat(sizes[1])).toBeLessThan(parseFloat(sizes[0]));
  await expect(
    page.locator(".pack-grid [data-item=f2] .food-category"),
  ).toHaveText("食物");
  await page.getByRole("button", { name: "整理", exact: true }).click();
  await expect(page.locator(".pack-grid > *").nth(0)).toHaveAttribute(
    "data-item",
    "w3",
  );
  await expect(page.locator(".pack-grid > *").nth(1)).toHaveAttribute(
    "data-item",
    "b2",
  );
  const coins = await page.evaluate(() => (window as any).__game.save.coins);
  await page
    .getByRole("button", { name: "出售珍贵及以下收集品", exact: true })
    .click();
  await expect(
    page.getByText("确认出售全部珍贵及以下收集品？", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/chrome-common-sale-confirm.png",
  });
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => (window as any).__game.save.stash.length),
  ).toBe(6);
  await page
    .getByRole("button", { name: "出售珍贵及以下收集品", exact: true })
    .click();
  await page.getByRole("button", { name: "确认出售", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.stash.map((i: any) => i.uid),
    ),
  ).toEqual(expect.arrayContaining(ids.slice(3)));
  expect(
    await page.evaluate(() => (window as any).__game.save.stash.length),
  ).toBe(3);
  expect(
    await page.evaluate(() => (window as any).__game.save.coins),
  ).toBeGreaterThan(coins);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await deploy(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(".raid-income")).toHaveText("本局收入 ◈ 0");
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts"),
      i = d.makeItem("c3_0");
    g.raid.search = {
      x: g.raid.p.x,
      y: g.raid.p.y,
      type: "basket",
      name: "鸟窝",
      items: [i],
      revealed: 1,
      open: true,
      locked: false,
      cooldown: 0,
    };
    g.raid.onChange();
  });
  await page.locator(".loot-panel .item-slot").dblclick();
  expect(await page.locator(".raid-income").textContent()).not.toBe(
    "本局收入 ◈ 0",
  );
  await page.getByRole("button", { name: "整理", exact: true }).click();
  await page.screenshot({ path: "test-results/chrome-raid-income-sort.png" });
});
test("中空十字准星可选择，战斗隐藏系统鼠标，菜单背包保留鼠标，新容器远距描边", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await start(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).last().click();
  await page.getByLabel("准星样式").selectOption("cross");
  await page.keyboard.press("Escape");
  await deploy(page);
  await page.mouse.move(1000, 450);
  await expect(page.locator("#crosshair")).toHaveClass("cross");
  expect(
    await page.locator("body").evaluate((el) => getComputedStyle(el).cursor),
  ).toBe("none");
  expect(
    await page
      .locator(".raid-timer")
      .evaluate((el) => getComputedStyle(el).cursor),
  ).toBe("none");
  await page.screenshot({ path: "test-results/chrome-hollow-crosshair.png" });
  await page.keyboard.press("Tab");
  expect(
    await page.locator("body").evaluate((el) => getComputedStyle(el).cursor),
  ).not.toBe("none");
  await expect(page.locator("#crosshair")).toBeHidden();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.walls = [];
    r.paused = true;
    r.p.x = 900;
    r.p.y = 4800;
    r.containers = ["basket", "toolbox", "safe"].map((type, i) => ({
      x: 750 + i * 150,
      y: 4650,
      type,
      name: type,
      items: [],
      revealed: 0,
      open: false,
      locked: false,
      cooldown: 0,
    }));
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return g.raid.containers.every(
          (c: any) => g.renderer3d.containers.get(c)?.group.userData.ready,
        );
      }),
    )
    .toBe(true);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = r.containers[2].x;
    r.p.y = r.containers[2].y + 150;
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game,
          m = g.renderer3d.containers.get(g.raid.containers[2]);
        return m.group.userData.highlighted;
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__game;
      return g.renderer3d.containers.get(g.raid.containers[2]).outlines[0]
        .material.uniforms.width.value;
    }),
  ).toBe(3.4);
  await page.screenshot({ path: "test-results/chrome-gold-outline-150.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.containers.forEach((c: any) => (c.open = true));
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return g.raid.containers.every(
          (c: any) => g.renderer3d.containers.get(c).opened.visible,
        );
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/chrome-new-low-containers-open.png",
  });
  expect(errors).toEqual([]);
});
test("常驻付费撤离靠近显示E提示，付款后真实倒计时结算，通知与滚动条样式可见", async ({
  page,
}) => {
  test.setTimeout(45000);
  await start(page);
  await deploy(page);
  const coins = await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid,
      e = r.exits.find((e: any) => e.paid);
    r.containers = [];
    r.p.x = e.x;
    r.p.y = e.y;
    return g.save.coins;
  });
  await expect(page.locator("#paid-exit-hint")).toBeVisible();
  await expect(page.locator("#paid-exit-hint")).toContainText(
    "按 E 付费以开启撤离点",
  );
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    coins,
  );
  const size = await page
    .locator("#paid-exit-hint")
    .evaluate((el) => getComputedStyle(el).fontSize);
  expect(size).toBe("34px");
  await page.screenshot({ path: "test-results/chrome-paid-exit-e-hint.png" });
  await page.keyboard.press("e");
  await expect(page.locator("#paid-exit-hint")).toBeHidden();
  await expect(
    page.locator(".toast").filter({ hasText: "撤离已启动" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".toast")
      .first()
      .evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe("34px");
  await expect(
    page.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.screenshot({
    path: "test-results/chrome-exit-after-e-payment.png",
  });
  await page.getByRole("button", { name: /返回基地/ }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  const scrollbar = await page
    .locator(".warehouse-scroll")
    .evaluate((el) => getComputedStyle(el).scrollbarColor);
  expect(scrollbar).toContain("rgb(181, 173, 120)");
});

test("农庄两处新增小建筑可真实走入并搜索，新增八个容器正常加载", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await deploy(page);
  await page.waitForFunction(
    () => (window as any).__game.renderer3d.villageStage.userData.assetsReady,
  );
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.raid.containers.filter(
          (c: any) => c.region === "boss-yard",
        ).length,
    ),
  ).toBe(8);
  for (let index = 0; index < 2; index++) {
    const angle = await page.evaluate(async (index) => {
      const g = (window as any).__game,
        v = await import("/src/village.ts"),
        b = v.villageBuildings.find((b) => b.id === `boss-annex-${index}`)!;
      Object.assign(g.raid.p, v.buildingWorld(b, 0, b.doorY + 65));
      g.raid.p.stamina = 100;
      const body = g.renderer3d.villageStage.userData.buildings
        .find((m: any) => m.id === b.id)
        .group.getObjectByName("body");
      body.geometry.computeBoundingBox();
      const width =
        body.geometry.boundingBox.max.x - body.geometry.boundingBox.min.x;
      // House side trim extends to ±2.95 source units; structural walls remain ±2.5.
      const expectedWidth = b.model.startsWith("weathered-shed")
        ? 303
        : b.openStructure
          ? b.w
          : b.w * 1.18;
      if (Math.abs(width - expectedWidth) > 3)
        throw Error(`${b.id}: source body ${width}, expected ${expectedWidth}`);
      const renderer = g.renderer3d,
        group = renderer.villageStage.userData.buildings.find(
          (m: any) => m.id === b.id,
        ).group;
      group.updateMatrixWorld(true);
      const ray = renderer.ray,
        near = ray.near,
        far = ray.far;
      for (const side of [-12, 0, 12])
        for (const height of [20, 45]) {
          const start = v.buildingWorld(b, side, b.doorY + 48),
            end = v.buildingWorld(b, side, 0),
            direction = renderer.camera.position
              .clone()
              .set(end.x - start.x, 0, end.y - start.y);
          ray.set(
            renderer.camera.position.clone().set(start.x, height, start.y),
            direction.clone().normalize(),
          );
          ray.near = 0;
          ray.far = direction.length() - 8;
          if (
            ray
              .intersectObjects(group.children, true)
              .some((h: any) => h.object.name !== "floor")
          )
            throw Error(
              `${b.id}: visible doorway blocked at ${side}/${height}`,
            );
        }
      ray.near = near;
      ray.far = far;
      return b.rotation;
    }, index);
    const keys = angle > 0 ? ["KeyD", "KeyW"] : ["KeyA", "KeyW"];
    for (const key of keys) await page.keyboard.down(key);
    // Start on the doorway centerline after both keys are down: remote keyboard
    // calls can span a frame and otherwise introduce a one-axis drift at 45 degrees.
    await page.evaluate(async (index) => {
      const g = (window as any).__game,
        v = await import("/src/village.ts"),
        b = v.villageBuildings.find((b) => b.id === `boss-annex-${index}`)!;
      Object.assign(g.raid.p, v.buildingWorld(b, 0, b.doorY + 65));
      g.annexEntered = false;
      // Observe every game frame so software rendering / remote RPC latency cannot
      // skip the short doorway-to-box interval while a real key remains held.
      const watch = () => {
        const p = v.buildingLocal(b, g.raid.p.x, g.raid.p.y);
        if (Math.abs(p.x) < 40 && p.y < 20 && p.y > -60) {
          g.annexEntered = true;
          g.raid.paused = true;
        } else requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    }, index);
    try {
      await expect
        .poll(() => page.evaluate(() => (window as any).__game.annexEntered), {
          timeout: 7000,
          intervals: [50],
        })
        .toBe(true);
    } finally {
      for (const key of keys) await page.keyboard.up(key);
    }
    await page.evaluate(() => {
      (window as any).__game.raid.paused = false;
    });
    await page.keyboard.press("e");
    await expect(page.locator(".loot-panel")).toBeVisible();
    await expect(page.locator(".inventory-panel")).toBeVisible();
    await page.screenshot({
      path: `test-results/chrome-farm-annex-${index}.png`,
    });
    await page.keyboard.press("e");
  }
  expect(errors).toEqual([]);
});
