import { test, expect, type Page } from "@playwright/test";
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
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(8);
  await expect(page.locator('[data-grid="stash"] > *')).toHaveCount(60);
  await expect(page.locator('[data-grid="stash"] .empty-slot')).toHaveCount(55);
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
    page.getByRole("heading", { name: "暂停", exact: true }),
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
  await expect(page.locator('[data-grid="pack"] > *')).toHaveCount(8);
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
