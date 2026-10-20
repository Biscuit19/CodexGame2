import { test, expect, type Page } from "@playwright/test";
async function start(page: Page, temporary = true) {
  await page.goto("/?test=1");
  if (temporary)
    await page
      .getByRole("button", { name: "临时测试入口", exact: true })
      .click();
  else {
    await page.getByRole("button", { name: "新的游戏", exact: true }).click();
    await page
      .getByRole("button", { name: "创建并进入基地", exact: true })
      .click();
  }
}
async function deploy(page: Page) {
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__game.raid.enemies = [];
  });
}
test("商店双击和F只购买一次，锁定首领提示准确；仓库与装备栏F和双击共用逻辑", async ({
  page,
}) => {
  await start(page, false);
  await page.evaluate(() => {
    (window as any).__game.save.coins = 999999;
  });
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await expect(
    page.getByText("双击或F购买物品。", { exact: true }),
  ).toBeVisible();
  const original = await page.evaluate(
    () => (window as any).__game.save.stock?.w0 || 0,
  );
  await page.locator(".shop-grid [data-item=w0]").hover();
  await page.keyboard.press("f");
  expect(await page.evaluate(() => (window as any).__game.save.stock.w0)).toBe(
    original + 1,
  );
  await page.locator(".shop-grid [data-item=w0]").dblclick();
  expect(await page.evaluate(() => (window as any).__game.save.stock.w0)).toBe(
    original + 2,
  );
  const locked = await page.evaluate(
    async () =>
      Object.values((await import("/src/data.ts")).db).find(
        (d) => d.kind === "weapon" && d.unlock === 1,
      )!.id,
  );
  await expect(page.locator(`.shop-grid [data-item=${locked}]`)).toBeDisabled();
  await expect(page.locator(`.shop-grid [data-item=${locked}]`)).toContainText(
    "击败罐头监工·铁腮解锁",
  );
  const coins = await page.evaluate(() => (window as any).__game.save.coins);
  await page.locator(`.shop-grid [data-item=${locked}]`).hover();
  await page.keyboard.press("f");
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    coins,
  );
  await page.screenshot({
    path: "test-results/chrome-shop-quick-purchase-lock.png",
  });
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.defeated = ["iron"];
    g.render();
  });
  await expect(page.locator(`.shop-grid [data-item=${locked}]`)).toBeEnabled();
  await expect(
    page.locator(`.shop-grid [data-item=${locked}]`),
  ).not.toContainText("解锁");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  const ids = await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.pack = [];
    g.save.stash = [d.makeItem("h2"), d.makeItem("w3")];
    g.save.equipment.primary.loaded = { tier: 1, count: 17 };
    return g.save.stash.map((i: any) => i.uid);
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator(`.warehouse-grid [data-id="${ids[0]}"]`).hover();
  await page.keyboard.press("f");
  await expect(page.locator(`.pack-grid [data-id="${ids[0]}"]`)).toBeVisible();
  await page.locator(`.warehouse-grid [data-id="${ids[1]}"]`).dblclick();
  await expect(page.locator(`.pack-grid [data-id="${ids[1]}"]`)).toBeVisible();
  await page
    .locator(".equipped-slot[data-slot=primary] .equipped-item")
    .hover();
  await page.keyboard.press("f");
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.primary),
  ).toBeNull();
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.save.stash.find((i: any) => i.id === "w0").loaded
          .count,
    ),
  ).toBe(17);
  await page
    .locator(".equipped-slot[data-slot=helmet] .equipped-item")
    .dblclick();
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.helmet),
  ).toBeNull();
});
test("仓库勾选批量出售及Chrome确认，出战缺项可返回整备或确认空装出击", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  const ids = await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.stash = ["w3", "c4_0", "f2", "h3"].map((id) => d.makeItem(id));
    return g.save.stash.map((i: any) => i.uid);
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.getByRole("button", { name: "批量出售", exact: true }).click();
  await expect(page.locator(".batch-item input[type=checkbox]")).toHaveCount(4);
  await page.locator(`.batch-item input[data-id="${ids[0]}"]`).click();
  await page.locator(`.batch-item .item-slot[data-id="${ids[1]}"]`).click();
  await expect(page.locator(".batch-item input:checked")).toHaveCount(2);
  await page
    .getByRole("button", { name: "出售所选（2）", exact: true })
    .click();
  await expect(
    page.getByText("确认出售选中的2件物品？", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/chrome-batch-sale-checks.png" });
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => (window as any).__game.save.stash.length),
  ).toBe(4);
  await page
    .getByRole("button", { name: "出售所选（2）", exact: true })
    .click();
  await page.getByRole("button", { name: "确认批量出售", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.stash.map((i: any) => i.uid),
    ),
  ).toEqual(ids.slice(2));
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.evaluate(() => {
    const s = (window as any).__game.save;
    s.pack = [];
    s.secure = [];
    for (const slot of Object.keys(s.equipment)) s.equipment[slot] = null;
  });
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "出战前检查", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".preflight-list li")).toHaveCount(3);
  expect(await page.evaluate(() => (window as any).__game.save.pending)).toBe(
    false,
  );
  await page.screenshot({
    path: "test-results/chrome-preflight-missing-equipment.png",
  });
  await page.getByRole("button", { name: "返回装备", exact: true }).click();
  await expect(page.locator(".warehouse-panel")).toBeVisible();
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.getByRole("button", { name: "继续前往", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  expect(await page.evaluate(() => (window as any).__game.save.pending)).toBe(
    true,
  );
  await page.evaluate(() => {
    (window as any).__game.raid.enemies = [];
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "退出本局", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.secondary = d.makeItem("w3");
    g.save.equipment.ammo = d.makeItem("m1", 120);
    g.save.equipment.food = d.makeItem("f1");
  });
  await deploy(page);
  expect(
    await page.evaluate(() => (window as any).__game.raid.activeWeapon),
  ).toBe("secondary");
});
test("鸟窝完整蛋与碎蛋、蓝白保温箱、绿色垃圾桶开合和原画猫爪刀实际渲染", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await start(page);
  await deploy(page);
  const converted = await page.evaluate(() => {
    const g = (window as any).__game;
    return {
      coolers: g.raid.containers.filter((c: any) => c.type === "cooler").length,
      bins: g.raid.containers.filter((c: any) => c.type === "trashcan").length,
      decor: g.renderer3d.villageStage.userData.props.filter((p: any) =>
        ["cooler", "trashcan"].includes(p.model),
      ).length,
    };
  });
  expect(converted.coolers).toBeGreaterThan(0);
  expect(converted.bins).toBeGreaterThan(0);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.paused = true;
    r.walls = [];
    r.p.x = 900;
    r.p.y = 4800;
    r.p.angle = Math.PI / 2;
    r.containers = ["basket", "cooler", "trashcan"].map((type, i) => ({
      type,
      name: type,
      x: 760 + i * 140,
      y: 4640,
      items: [],
      open: false,
      revealed: 0,
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
  await page.screenshot({
    path: "test-results/chrome-nest-cooler-bin-closed.png",
  });
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.containers.forEach((c: any) => (c.open = true));
    g.raid.activeWeapon = "melee";
    g.renderer3d.camera.zoom = 2;
    g.renderer3d.camera.updateProjectionMatrix();
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
    path: "test-results/chrome-nest-broken-egg-green-bin-open.png",
  });
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.p.angle = Math.PI / 4;
    g.renderer3d.camera.zoom = 3;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: "test-results/chrome-knife-quarter.png" });
  for (const angle of [0, Math.PI]) {
    await page.evaluate((angle) => {
      const g = (window as any).__game;
      g.raid.p.angle = angle;
      g.renderer3d.camera.zoom = 5;
      g.renderer3d.camera.updateProjectionMatrix();
    }, angle);
    await page.waitForTimeout(100);
    await page.screenshot({
      path: `test-results/chrome-knife-${angle === 0 ? "left" : "right"}.png`,
    });
  }
  const knife = await page.evaluate(() => {
    const k = (window as any).__game.renderer3d.actors.get("player").knife;
    return {
      visible: k.visible,
      names: k
        .getObjectByName("cat-paw-knife")
        .children.map((m: any) => m.name),
    };
  });
  expect(knife.visible).toBe(true);
  expect(knife.names).toEqual(
    expect.arrayContaining([
      "red-swept-blade",
      "cream-cutting-face",
      "pink-paw-guard",
      "gold-pommel",
    ]),
  );
  expect(errors).toEqual([]);
});
test("破旧棚屋替换所有露天木架，门洞可走入搜索，满背包F与双击优先空枪位", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await deploy(page);
  await page.waitForFunction(
    () => (window as any).__game.renderer3d.villageStage.userData.assetsReady,
  );
  const sites = await page.evaluate(async () => {
    const v = await import("/src/village.ts");
    return v.villageBuildings
      .filter((b) => b.model.startsWith("weathered-shed"))
      .map((b) => ({ id: b.id, rotation: b.rotation, model: b.model }));
  });
  expect(sites).toHaveLength(4);
  for (const site of [sites[0], sites[1]]) {
    await page.evaluate(async (id) => {
      const g = (window as any).__game,
        v = await import("/src/village.ts"),
        b = v.villageBuildings.find((b) => b.id === id)!;
      Object.assign(g.raid.p, v.buildingWorld(b, 0, 150));
      g.raid.p.stamina = 100;
      g.siteEntered = false;
    }, site.id);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `test-results/chrome-${site.model}-exterior.png`,
    });
    const keys =
      site.rotation > 0.4
        ? ["KeyD", "KeyW"]
        : site.rotation < -0.4
          ? ["KeyA", "KeyW"]
          : ["KeyW"];
    for (const key of keys) await page.keyboard.down(key);
    await page.evaluate(async (id) => {
      const g = (window as any).__game,
        v = await import("/src/village.ts"),
        b = v.villageBuildings.find((b) => b.id === id)!;
      Object.assign(g.raid.p, v.buildingWorld(b, 0, 150));
      const watch = () => {
        const p = v.buildingLocal(b, g.raid.p.x, g.raid.p.y);
        if (Math.abs(p.x) < 40 && p.y < 10 && p.y > -50) {
          g.siteEntered = true;
          g.raid.paused = true;
        } else requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    }, site.id);
    try {
      await expect
        .poll(() => page.evaluate(() => (window as any).__game.siteEntered), {
          timeout: 8000,
        })
        .toBe(true);
    } finally {
      for (const key of keys) await page.keyboard.up(key);
    }
    await page.screenshot({ path: `test-results/chrome-${site.model}.png` });
    await page.evaluate(() => {
      (window as any).__game.raid.paused = false;
    });
    await page.keyboard.press("e");
    await expect(page.locator(".loot-panel")).toBeVisible();
    await page.keyboard.press("e");
  }
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.primary = null;
    g.save.equipment.secondary = null;
    g.save.pack = Array.from({ length: 20 }, () => d.makeItem("c1_0"));
    const c = {
      x: g.raid.p.x,
      y: g.raid.p.y,
      type: "weapon",
      name: "测试武器箱",
      items: [d.makeItem("w3"), d.makeItem("w7")],
      open: true,
      revealed: 2,
      locked: false,
      cooldown: 0,
    };
    g.raid.search = c;
    g.raid.inventory = true;
    g.raid.onChange();
  });
  await page.locator(".loot-panel .item-slot").first().hover();
  await page.keyboard.press("f");
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.primary.id),
  ).toBe("w3");
  await page.locator(".loot-panel .item-slot").first().dblclick();
  expect(
    await page.evaluate(
      () => (window as any).__game.save.equipment.secondary.id,
    ),
  ).toBe("w7");
  expect(
    await page.evaluate(() => (window as any).__game.save.pack.length),
  ).toBe(20);
});
