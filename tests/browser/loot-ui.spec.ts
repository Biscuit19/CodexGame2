import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
}
async function deploy(page: Page) {
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.walls = [];
  });
}
async function drag(page: Page, from: string, to: string) {
  await page.locator(from).dragTo(page.locator(to));
}
test("背包实体拖拽交换、空位保留，名称品质和功能说明清晰区分", async ({
  page,
}) => {
  await start(page);
  const ids = await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.pack = ["c1_0", "f2", "w1", "m2", "h3"].map((id) => d.makeItem(id));
    g.save.packLayout = undefined;
    return g.save.pack.map((i: any) => i.uid);
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await drag(
    page,
    `.pack-grid [data-id="${ids[0]}"]`,
    `.pack-grid [data-id="${ids[1]}"]`,
  );
  await expect(page.locator(".pack-grid > *").nth(0)).toHaveAttribute(
    "data-id",
    ids[1],
  );
  await expect(page.locator(".pack-grid > *").nth(1)).toHaveAttribute(
    "data-id",
    ids[0],
  );
  await drag(
    page,
    `.pack-grid [data-id="${ids[0]}"]`,
    ".pack-grid > :nth-child(9)",
  );
  await expect(page.locator(".pack-grid > *").nth(1)).toHaveClass(/empty-slot/);
  await expect(page.locator(".pack-grid > *").nth(8)).toHaveAttribute(
    "data-id",
    ids[0],
  );
  await page.locator(`.pack-grid [data-id="${ids[1]}"]`).click();
  await expect(page.locator("#item-menu")).toContainText("补给品");
  const colors = await page.evaluate(() => {
    const menu = document.querySelector("#item-menu")!;
    return [
      getComputedStyle(menu.querySelector(".item-function")!).color,
      getComputedStyle(menu.querySelector(".item-description")!).color,
    ];
  });
  expect(colors[0]).not.toBe(colors[1]);
  await expect(page.locator(`.pack-grid [data-id="${ids[1]}"]`)).toContainText(
    "补给品",
  );
  await page.screenshot({ path: "test-results/chrome-pack-slot-stats.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(page.locator(".pack-grid > *").nth(8)).toHaveAttribute(
    "data-id",
    ids[0],
  );
  expect(
    await page.evaluate(
      () =>
        new Set((window as any).__game.save.pack.map((i: any) => i.uid)).size,
    ),
  ).toBe(5);
});
test("Q进食、F与双击共享更强装备替换，空容器保留，拖出直接删除", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.pack = [d.makeItem("c1_0"), d.makeItem("c2_0")];
    g.save.equipment.food = d.makeItem("f1", 2);
    g.save.equipment.helmet = d.makeItem("h1");
  });
  await deploy(page);
  const ids = await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      d = await import("/src/data.ts");
    r.paused = true;
    r.p.hp = 40;
    const items = [d.makeItem("h5"), d.makeItem("c3_0")];
    const c = {
      x: r.p.x + 50,
      y: r.p.y,
      type: "box",
      name: "测试容器",
      items,
      open: false,
      revealed: 2,
    };
    r.containers = [c];
    return items.map((i) => i.uid);
  });
  // Open with E through the real keyboard handler (gameplay must be unpaused).
  await page.evaluate(() => {
    (window as any).__game.raid.paused = false;
  });
  await page.keyboard.press("e");
  await expect(page.locator(".loot-panel")).toBeVisible();
  await page.locator(`.loot-panel [data-id="${ids[0]}"]`).hover();
  await page.keyboard.press("f");
  expect(
    await page.evaluate(() => (window as any).__game.save.equipment.helmet.id),
  ).toBe("h5");
  expect(
    await page.evaluate(() => (window as any).__game.raid.healItem),
  ).toBeFalsy();
  await page.keyboard.press("q");
  expect(
    await page.evaluate(() => (window as any).__game.raid.healItem),
  ).toBeTruthy();
  await page.locator(`.loot-panel [data-id="${ids[1]}"]`).hover();
  await page.keyboard.press("f");
  // Old helmet was returned to the box by exactly the same auto-equip logic as double-click.
  await page.locator(".loot-panel .item-slot").dblclick();
  await expect(page.locator(".empty-container")).toHaveText("容器已清空");
  await page.keyboard.press("e");
  await expect(page.locator(".raid-inventory-layout")).toHaveCount(0);
  await page.keyboard.press("e");
  await expect(page.locator(".empty-container")).toBeVisible();
  const packUid = await page
    .locator(".pack-grid .item-slot")
    .first()
    .getAttribute("data-id");
  await drag(
    page,
    `.pack-grid [data-id="${packUid}"]`,
    ".pack-grid > :nth-child(10)",
  );
  await expect(page.locator(".pack-grid > *").nth(9)).toHaveAttribute(
    "data-id",
    packUid!,
  );
  await drag(
    page,
    `.pack-grid [data-id="${packUid}"]`,
    ".pack-grid > :nth-child(2)",
  );
  await expect(page.locator(".pack-grid > *").nth(1)).toHaveAttribute(
    "data-id",
    packUid!,
  );
  const before = await page.evaluate(
    () => (window as any).__game.raid.containers.length,
  );
  const item = page.locator(".pack-grid .item-slot").first(),
    uid = await item.getAttribute("data-id");
  // Drag out of both panels, using an actual Chrome drag sequence.
  const box = await item.boundingBox();
  await page.mouse.move(box!.x + 20, box!.y + 20);
  await page.mouse.down();
  await page.mouse.move(800, 940, { steps: 15 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        (uid) =>
          (window as any).__game.save.pack.some((i: any) => i.uid === uid),
        uid,
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(() => (window as any).__game.raid.containers.length),
  ).toBe(before);
});
test("九类来源模型开合、近距白金描边和敌猫统一连续轮廓实际渲染", async ({
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
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.p.x = 900;
    r.p.y = 4800;
    r.p.angle = -Math.PI / 2;
    r.paused = true;
    r.containers = [
      "box",
      "litter",
      "cabinet",
      "medical",
      "weapon",
      "bed",
      "safe",
      "corpse",
      "corpse",
    ].map((type, i) => ({
      type,
      x: 650 + (i % 5) * 110,
      y: 4600 + Math.floor(i / 5) * 110,
      name: type,
      items: [],
      open: false,
      revealed: 0,
      bossLoot: i === 8,
    }));
    for (let i = 0; i < 4; i++) {
      const e = r.spawn(700 + i * 120, 4900, i + 1, 2);
      e.cool = 999;
    }
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__game.raid.containers
            .map((c: any) =>
              (window as any).__game.renderer3d.containers.get(c),
            )
            .filter(Boolean)
            .filter((m: any) => m.group.userData.ready).length,
      ),
    )
    .toBe(9);
  const state = () =>
    page.evaluate(() =>
      (window as any).__game.raid.containers
        .map((c: any) => (window as any).__game.renderer3d.containers.get(c))
        .filter(Boolean)
        .map((m: any) => ({
          kind: m.group.userData.kind,
          visible: m.group.visible,
          open: m.opened.visible,
          highlight: m.group.userData.highlighted,
          gold: m.group.userData.highValue,
        })),
    );
  expect((await state()).every((m) => m.visible && !m.open)).toBe(true);
  for (const [index, gold] of [
    [0, false],
    [6, true],
    [8, true],
  ] as const) {
    await page.evaluate((index) => {
      const r = (window as any).__game.raid,
        c = r.containers[index];
      r.p.x = c.x;
      r.p.y = c.y + 55;
    }, index);
    await expect.poll(async () => (await state())[index].highlight).toBe(true);
    expect((await state())[index].gold).toBe(gold);
    await page.screenshot({
      path: `test-results/chrome-container-outline-${index}.png`,
    });
  }
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.containers.forEach((c: any) => (c.open = true));
    r.p.x = 900;
    r.p.y = 4800;
  });
  await expect
    .poll(async () => (await state()).every((m) => m.open && m.visible))
    .toBe(true);
  await page.screenshot({
    path: "test-results/chrome-container-open-enemies.png",
  });
  const rigs = await page.evaluate(() =>
    [...(window as any).__game.renderer3d.actors.values()]
      .filter((r: any) => r.root.userData.enemy)
      .map((r: any) => ({
        smooth: !!r.player,
        head: r.head.children.some(
          (m: any) => m.name === "continuous-head-and-ears",
        ),
        gear: r.helmet.children.length,
        scale: r.root.scale.x,
      })),
  );
  expect(rigs).toHaveLength(4);
  expect(
    rigs.every((r) => r.smooth && r.head && r.gear > 0 && r.scale > 0.8),
  ).toBe(true);
  expect(errors).toEqual([]);
});
