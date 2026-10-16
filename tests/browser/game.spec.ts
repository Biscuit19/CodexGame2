import { test, expect, type Page } from "@playwright/test";

test("基地设置在声音失败时仍打开顶层菜单，设置、指南和返回开始均可使用", async ({
  page,
}) => {
  await start(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => {
    (window as any).__game.sound.start = () => {
      throw new Error("测试声音设备故障");
    };
    const cover = document.createElement("div");
    cover.id = "stacking-test";
    cover.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#15231d;pointer-events:none";
    document.body.append(cover);
  });
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const dialog = page.locator("#base-menu");
  expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
  for (const name of ["返回开始界面", "设置", "操作指南"])
    await expect(
      dialog.getByRole("button", { name, exact: true }),
    ).toBeVisible();
  expect(
    await dialog
      .getByRole("button", { name: "设置", exact: true })
      .evaluate((el) => {
        const b = el.getBoundingClientRect();
        return !!document
          .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
          ?.closest("#base-menu");
      }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/base-menu-top-layer.png" });
  await page.evaluate(() => document.querySelector("#stacking-test")?.remove());
  await dialog.getByRole("button", { name: "设置", exact: true }).click();
  await expect(dialog.getByText("主音量", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "返回基地菜单", exact: true })
    .click();
  await dialog.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(
    dialog.getByRole("heading", { name: "操作指南", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "返回基地菜单", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "返回开始界面", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "读取存档", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("Esc 菜单高于最高层级游戏画面，实际可点击并关闭", async ({ page }) => {
  await start(page);
  await deploy(page);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("#world,#scene3d"))
      el.style.zIndex = "2147483647";
  });
  await page.keyboard.press("Escape");
  const dialog = page.locator("#game-menu");
  expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
  const resume = dialog.getByRole("button", { name: "继续游戏", exact: true });
  expect(
    await resume.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return !!document
        .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
        ?.closest("#game-menu");
    }),
  ).toBe(true);
  await page.screenshot({ path: "test-results/esc-top-layer.png" });
  await resume.click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => (window as any).__game.raid.paused)).toBe(
    false,
  );
});

test("仓库背包物品显示价值、可出售和全部放回，武器可修复并损耗上限", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(
    page.locator('[data-grid="pack"] [data-item="m1"] .item-value'),
  ).toBeVisible();
  await page.locator('[data-grid="pack"] [data-item="f1"]').click();
  await expect(page.locator("#item-menu .item-sale-value")).toContainText(
    "出售价值",
  );
  const coins = await page.evaluate(() => (window as any).__game.save.coins);
  await page
    .locator("#item-menu")
    .getByRole("button", { name: /^出售/ })
    .click();
  expect(
    await page.evaluate(() => (window as any).__game.save.coins),
  ).toBeGreaterThan(coins);
  await page.getByRole("button", { name: "全部放回", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__game.save.pack.length),
  ).toBe(0);
  await expect(
    page.getByRole("button", { name: "全部放回", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.equipment.primary.durability = 12;
    g.render();
  });
  await page.locator('[data-slot="primary"] .equipped-item').click();
  await expect(page.locator("#item-menu")).toContainText("威力 58%");
  await page
    .locator("#item-menu")
    .getByRole("button", { name: /^修复/ })
    .click();
  expect(
    await page.evaluate(() => {
      const w = (window as any).__game.save.equipment.primary;
      return [w.durability, w.maxDurability];
    }),
  ).toEqual([89.44, 89.44]);
  await page.screenshot({ path: "test-results/warehouse-bulk-sale.png" });
});

test("空装备位双击默认穿戴，拾取弹药优先补满原堆叠至90发", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.equipment.primary = null;
    g.render();
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator('[data-grid="stash"] [data-item="w3"]').dblclick();
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.primary.id),
  ).toBe("w3");
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.pack.some((i: any) => i.id === "w3"),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await deploy(page);
  await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    g.save.pack = [d.makeItem("m1", 80)];
    const c = r.containers[0];
    c.items = [d.makeItem("m1", 40)];
    c.revealed = 1;
    r.p.x = c.x - 25;
    r.p.y = c.y;
  });
  await page.keyboard.press("KeyE");
  await page.locator('.loot-panel [data-item="m1"]').dblclick();
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.pack.map((i: any) => i.qty),
    ),
  ).toEqual([90, 30]);
  await page.screenshot({ path: "test-results/inventory-v4.png" });
});

test("撤离后不重读即可连续入库，弹匣不卸弹且没有待整理物品", async ({
  page,
}) => {
  await start(page);
  await deploy(page);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    g.raid.mag = 17;
    g.raid.finish(true, "test");
  });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__game.raid),
  ).toBeUndefined();
  await expect(page.getByText("待整理战利品", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as any).__game.save.equipment.primary.loaded.count,
    ),
  ).toBe(17);
  for (let n = 0; n < 3; n++) {
    const card = page.locator('[data-grid="pack"] .item-slot').first();
    await card.click();
    await page
      .locator("#item-menu")
      .getByRole("button", { name: "放入仓库", exact: true })
      .click();
  }
  expect(
    await page.evaluate(() => (window as any).__game.save.pack.length),
  ).toBe(0);
  expect(
    await page.evaluate(() => (window as any).__game.save.overflow.length),
  ).toBe(0);
});

test("真实失焦打开独立游戏菜单，Esc 关闭背包后再次打开菜单", async ({
  page,
  context,
}) => {
  await start(page);
  await deploy(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).toBeVisible();
  await expect(
    page
      .locator("#game-menu")
      .getByRole("button", { name: "继续游戏", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#game-menu")).toBeHidden();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "左侧背包" })).toHaveCount(0);
  await expect(page.locator("#game-menu")).toBeHidden();
  const other = await context.newPage();
  await other.goto("about:blank");
  await page.bringToFront();
  // Also exercise the browser event directly on platforms whose headless tabs keep focus.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator("#game-menu")).toBeVisible();
  await expect(
    page
      .locator("#game-menu")
      .getByRole("button", { name: "退出本局", exact: true }),
  ).toBeVisible();
  await other.close();
  await page.screenshot({ path: "test-results/menu-v4.png" });
});

test("一次 E 同时开两栏、容器直接进食、拖出背包丢弃、近战与五列布局", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await deploy(page);
  await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    const c = r.containers[0];
    c.items = [d.makeItem("f2")];
    c.revealed = 1;
    r.p.x = c.x - 25;
    r.p.y = c.y;
    r.p.hp = 50;
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  await expect(page.getByRole("region", { name: "右侧容器" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "保护", exact: true }),
  ).toHaveCount(0);
  expect(
    await page
      .locator(".pack-grid")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(5);
  await page.locator('.loot-panel [data-item="f2"]').click();
  await page
    .locator("#item-menu")
    .getByRole("button", { name: "食用", exact: true })
    .click();
  await page.waitForFunction(() => (window as any).__game.raid.p.hp === 85);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  const item = page.locator('[data-grid="pack"] [data-item="f1"]');
  const uid = await item.getAttribute("data-id");
  await item.dragTo(page.locator("#world"), {
    targetPosition: { x: 750, y: 500 },
  });
  expect(
    await page.evaluate(
      (uid) => (window as any).__game.save.pack.some((i: any) => i.uid === uid),
      uid,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      (uid) =>
        (window as any).__game.raid.containers.some(
          (c: any) =>
            c.name === "丢下的物品" && c.items.some((i: any) => i.uid === uid),
        ),
      uid,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Digit3");
  expect(
    await page.evaluate(() => (window as any).__game.raid.activeWeapon),
  ).toBe("melee");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 1000;
    r.p.y = 1000;
    r.p.angle = 0;
    const e = r.spawn(1050, 1000, 0, 1);
    e.cool = 999;
    e.turret = true;
  });
  await page.waitForTimeout(300);
  const target = await page.evaluate(() =>
    (window as any).__game.renderer3d.project(1050, 1000, 28),
  );
  await page.mouse.move(target.x, target.y);
  await page.mouse.down();
  await page.waitForTimeout(550);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__game.raid.stats.damageDealt),
  ).toBeGreaterThan(0);
});

test("原描述、物品旁菜单、正方形格子、仓库拖拽装备与筛选容量", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "当前装备", exact: true }),
  ).toBeVisible();
  const w = page.locator('[data-grid="stash"] [data-item="w3"]');
  await w.click();
  await expect(page.locator("#item-menu .item-description")).toHaveText(
    "中距离 · 稳定点射",
  );
  await expect(
    page.locator("#item-menu").getByRole("button", { name: "放入安全箱" }),
  ).toHaveCount(0);
  const box = await w.boundingBox();
  expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);
  await page.getByRole("heading", { name: "仓库", exact: true }).click();
  await w.dragTo(page.locator('[data-slot="primary"]'));
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.primary.id),
  ).toBe("w3");
  await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game;
    for (const id of ["a2", "h2", "c4_0"]) g.save.stash.push(d.makeItem(id));
    g.render();
  });
  for (const id of ["a2", "h2", "m1", "f2", "c4_0"]) {
    await page
      .locator(`[data-grid="stash"] [data-item="${id}"]`)
      .first()
      .click();
    const desc = await page.evaluate(
      async (id) => (await import("/src/data.ts")).db[id].desc,
      id,
    );
    await expect(page.locator("#item-menu .item-description")).toHaveText(desc);
    await page.getByRole("heading", { name: "仓库", exact: true }).click();
  }
  await page.getByRole("heading", { name: "仓库", exact: true }).click();
  await page.locator("#filter").selectOption("ammo");
  const occupied = await page.evaluate(
    () => (window as any).__game.save.stash.length,
  );
  await expect(page.locator('[data-grid="stash"] .empty-slot')).toHaveCount(
    60 - occupied,
  );
  await page.screenshot({ path: "test-results/inventory-v3.png" });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  const before = await page.evaluate(() => (window as any).__game.save.coins);
  await page.locator('.shop-grid [data-item="w0"]').click();
  await expect(page.locator("#item-menu .item-description")).toHaveText(
    "近距离 · 全自动 · 快速压制",
  );
  await page
    .locator("#item-menu")
    .getByRole("button", { name: /购买/ })
    .click();
  expect(await page.evaluate(() => (window as any).__game.save.coins)).toBe(
    before - 900,
  );
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.stash.some((i: any) => i.id === "w0"),
    ),
  ).toBe(true);
});

test("满包舔包双击更强头甲、旧甲留在容器，Esc 先关闭搜索再开菜单", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await deploy(page);
  await page.evaluate(async () => {
    const d = await import("/src/data.ts"),
      g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    g.save.pack = Array.from({ length: 20 }, () => d.makeItem("f1"));
    const c = r.containers[0];
    c.items = [d.makeItem("a3"), d.makeItem("h3")];
    c.revealed = 2;
    r.p.x = c.x - 25;
    r.p.y = c.y;
  });
  await page.keyboard.press("KeyE");
  await page.locator('.loot-panel [data-item="a3"]').click();
  await expect(page.locator("#item-menu .item-description")).not.toBeEmpty();
  await page.locator('.loot-panel [data-item="a3"]').dblclick();
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.armor.id),
  ).toBe("a3");
  await expect(page.locator('.loot-panel [data-item="a1"]')).toBeVisible();
  await page.locator('.loot-panel [data-item="h3"]').dblclick();
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.helmet.id),
  ).toBe("h3");
  await expect(page.locator('.loot-panel [data-item="h1"]')).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__game.save.pack.length),
  ).toBe(20);
  await page.screenshot({ path: "test-results/loot-v3.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".loot-panel")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "左侧背包" })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__game.raid.paused)).toBe(
    false,
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "游戏菜单", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "继续游戏", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "退出本局", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await page.keyboard.press("Tab");
  await expect(page.locator(".equipped-grid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".equipped-grid")).toHaveCount(0);
});

test("地图一远离原点仍绘制双方弹道、枪口和命中特效", async ({ page }) => {
  await start(page);
  await deploy(page);
  const pixels = await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    r.p.x = 1000;
    r.p.y = 1000;
    r.paused = true;
    r.addBullet(1000, 976, 0, true, 20, 1);
    r.addBullet(1190, 976, Math.PI, false, 20, 1);
    r.hurtPlayer(5, 1);
    g.renderer3d.render(r, g.renderer);
    const project = g.renderer3d.project(1040, 1000, 32),
      ctx = g.renderer.ctx;
    const rgba = ctx.getImageData(
      Math.round(project.x) - 12,
      Math.round(project.y) - 12,
      24,
      24,
    ).data;
    return {
      pixels: Array.from(rgba).filter(
        (_: number, i: number) => i % 4 === 3 && rgba[i] > 0,
      ).length,
      culling: g.renderer3d.bulletLines.frustumCulled,
      particles: g.renderer3d.particlePoints.frustumCulled,
      muzzles: r.combatFX.filter((f: any) => f.kind === "muzzle").length,
    };
  });
  expect(pixels.pixels).toBeGreaterThan(20);
  expect(pixels.culling).toBe(false);
  expect(pixels.particles).toBe(false);
  expect(pixels.muzzles).toBe(2);
  await page.screenshot({ path: "test-results/combat-v3.png" });
});
async function start(page: Page, mode = "standard") {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await expect(
    page.locator('[data-action="new-mode"][data-id="standard"]'),
  ).toHaveClass(/selected/);
  if (mode === "easy")
    await page.locator('[data-action="new-mode"][data-id="easy"]').click();
  await page.getByRole("button", { name: "创建并进入基地" }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
}
async function deploy(page: Page) {
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator("#scene3d")).toBeVisible({ timeout: 20000 });
  await expect(page.locator("#raid-time")).toBeVisible();
}

test("开始菜单、标准模式默认、简洁基地、仓库右侧和固定空格", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await expect(
    page.getByRole("button", { name: "开始游戏", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "读取存档", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/title-v2.png" });
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await expect(
    page.locator('[data-action="new-mode"][data-id="standard"]'),
  ).toHaveClass(/selected/);
  await page.getByRole("button", { name: "创建并进入基地" }).click();
  expect(await page.evaluate(() => (window as any).__game.save.mode)).toBe(
    "standard",
  );
  await expect(page.locator(".base-tile")).toHaveCount(5);
  const content = await page.locator("#ui").innerText();
  expect(content).not.toMatch(/[A-Za-z]/);
  expect(content).not.toMatch(/小小的猫|整备一下|老爪的提醒|每一条命/);
  await page.screenshot({ path: "test-results/base-v2.png" });
  await page.getByRole("button", { name: "仓库与整备" }).click();
  const bag = await page
      .getByRole("region", { name: "左侧背包" })
      .boundingBox(),
    stash = await page.getByRole("region", { name: "右侧仓库" }).boundingBox();
  expect(bag!.x).toBeLessThan(stash!.x);
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(20);
  await expect(page.locator('[data-grid="stash"] > *')).toHaveCount(60);
  await expect(page.locator('[data-grid="stash"] .empty-slot')).toHaveCount(56);
  await page.screenshot({ path: "test-results/inventory-v2.png" });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "开始界面", exact: true }).click();
  await page.getByRole("button", { name: "读取存档", exact: true }).click();
  await page.getByRole("button", { name: "读取", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
});

test("地图一立体模型、切换疾跑、暂停设置与完整回滚", async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const before = await page.evaluate(() =>
    JSON.parse(JSON.stringify((window as any).__game.save)),
  );
  await deploy(page);
  await page.waitForTimeout(400);
  const geometry = await page.evaluate(() => {
    const g = (window as any).__game,
      rig = g.renderer3d.actors.get("player");
    return {
      meshes: g.renderer3d.webgl.info.render.calls,
      model: rig.head.children.length,
      legs: rig.legs.length,
      context: !!g.renderer3d.webgl.getContext(),
    };
  });
  expect(geometry.context).toBe(true);
  expect(geometry.model).toBeGreaterThan(5);
  expect(geometry.legs).toBe(2);
  expect(geometry.meshes).toBeGreaterThan(20);
  await page.evaluate(() => {
    (window as any).__game.raid.enemies = [];
  });
  const firstX = await page.evaluate(() => (window as any).__game.raid.p.x);
  await page.keyboard.press("Shift");
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    (x) => (window as any).__game.raid.p.x > x + 30,
    firstX,
  );
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => (window as any).__game.raid.sprintToggled),
  ).toBe(true);
  await page.keyboard.press("Shift");
  expect(
    await page.evaluate(() => (window as any).__game.raid.sprintToggled),
  ).toBe(false);
  await page.screenshot({ path: "test-results/map1-3d.png" });
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    g.save.coins -= 600;
    g.save.equipment.armor.durability = 3;
    g.save.collection.push("c4_0");
    r.mag = 1;
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "游戏菜单", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByText("主音量", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const slider = document.querySelector<HTMLInputElement>(
      '[data-setting="master"]',
    )!;
    slider.value = "0.35";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  before.settings.master = 0.35;
  await page.getByRole("button", { name: "返回暂停菜单" }).click();
  await page.getByRole("button", { name: "操作指南" }).click();
  await expect(page.getByRole("heading", { name: "操作指南" })).toBeVisible();
  await page.getByRole("button", { name: "返回暂停菜单" }).click();
  const paused = await page.evaluate(() => (window as any).__game.raid.time);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => (window as any).__game.raid.time)).toBe(
    paused,
  );
  await page.getByRole("button", { name: "退出本局" }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
  const after = await page.evaluate(() =>
    JSON.parse(JSON.stringify((window as any).__game.save)),
  );
  delete before.updated;
  delete after.updated;
  expect(after).toEqual(before);
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.sound.settings ===
        (window as any).__game.save.settings,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("容器立即打开，自动显示左侧背包，逐件搜索后双击拾取", async ({ page }) => {
  test.setTimeout(60000);
  await start(page, "easy");
  await deploy(page);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    const c = r.containers[0];
    r.p.x = c.x - 25;
    r.p.y = c.y;
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByRole("region", { name: "右侧容器" })).toBeVisible();
  await expect(page.getByRole("region", { name: "左侧背包" })).toBeVisible();
  const positions = await page.evaluate(() => ({
    bag: document
      .querySelector('[aria-label="左侧背包"]')!
      .getBoundingClientRect().x,
    container: document
      .querySelector('[aria-label="右侧容器"]')!
      .getBoundingClientRect().x,
  }));
  expect(positions.bag).toBeLessThan(positions.container);
  await expect(page.locator(".loot-panel .unrevealed")).not.toHaveCount(0);
  await page.waitForFunction(
    () => (window as any).__game.raid.search.revealed > 0,
    { timeout: 12000 },
  );
  const uid = await page.evaluate(
    () => (window as any).__game.raid.search.items[0].uid,
  );
  await page.locator(`.loot-panel .item-slot[data-id="${uid}"]`).dblclick();
  expect(
    await page.evaluate(
      (uid) => (window as any).__game.save.pack.some((i: any) => i.uid === uid),
      uid,
    ),
  ).toBe(true);
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(20);
  await page.screenshot({ path: "test-results/loot-v2.png" });
  await page.keyboard.press("Tab");
  await expect(page.locator(".loot-panel")).toHaveCount(0);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = r.exits[0].x;
    r.p.y = r.exits[0].y;
  });
  await expect(
    page.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "读取存档", exact: true }).click();
  await page.getByRole("button", { name: "读取", exact: true }).first().click();
  expect(
    await page.evaluate(() => (window as any).__game.save.stats.extracts),
  ).toBe(1);
  expect(
    await page.evaluate(
      (uid) => (window as any).__game.save.pack.some((i: any) => i.uid === uid),
      uid,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      (uid) =>
        (window as any).__game.save.stash.some((i: any) => i.uid === uid),
      uid,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator(`[data-grid="pack"] [data-id="${uid}"]`).click();
  await page
    .locator("#item-menu")
    .getByRole("button", { name: "放入仓库", exact: true })
    .click();
  expect(
    await page.evaluate(
      (uid) =>
        (window as any).__game.save.stash.some((i: any) => i.uid === uid),
      uid,
    ),
  ).toBe(true);
});

test("立体瞄准与真实射击，翻滚和换弹后仍能开火", async ({ page }) => {
  test.setTimeout(60000);
  await start(page);
  await deploy(page);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.p.x = 1000;
    r.p.y = 1000;
    const e = r.spawn(1150, 1000, 0, 1);
    e.cool = 999;
    e.state = "combat";
    e.homeX = e.x;
  });
  await page.waitForTimeout(300);
  const p = await page.evaluate(() => {
    const g = (window as any).__game;
    return g.renderer3d.project(1150, 1000, 28);
  });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(2200);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__game.raid.stats.kills),
  ).toBe(1);
  await page.keyboard.press("KeyR");
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => (window as any).__game.raid.mag)).toBe(30);
  await page.keyboard.press("Space");
  await page.waitForTimeout(600);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  expect(
    await page.evaluate(() => (window as any).__game.raid.mag),
  ).toBeLessThan(30);
});
