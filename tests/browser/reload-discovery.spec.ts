import { test, expect } from "@playwright/test";
async function enter(page: any) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(async () => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    await g.sound.prepare();
  });
}
test("真实逐件搜索：首次四五级替代音与提示同步，重复及装备正常发现", async ({
  page,
}) => {
  await enter(page);
  await page.evaluate(() => {
    const g = (window as any).__game,
      s = g.sound;
    r: {
      g.raid.enemies = [];
      g.raid.paused = true;
    }
    g.save.collection = [];
    g.save.discovered = [];
    g.revealLog = [];
    const original = s.ctx.createBufferSource.bind(s.ctx);
    s.ctx.createBufferSource = () => {
      const n = original(),
        start = n.start.bind(n),
        connect = n.connect.bind(n);
      let gain: any;
      n.connect = (a: any) => {
        gain = a;
        return connect(a);
      };
      n.start = (...args: any[]) => {
        const key = [...s.buffers].find(([, b]: any) => b === n.buffer)?.[0];
        if (key) g.revealLog.push({ key, gain: gain.gain.value });
        return start(...args);
      };
      return n;
    };
  });
  const reveal = async (tier: number, duplicate = false, weapon = false) =>
    page.evaluate(
      async ({ tier, duplicate, weapon }) => {
        const g = (window as any).__game,
          r = g.raid,
          d = await import("/src/data.ts");
        r.paused = true;
        r.search = undefined;
        r.inventory = false;
        r.walls = [];
        const id = weapon
          ? "w3"
          : Object.values(d.db).find(
              (v: any) => v.kind === "collectible" && v.tier === tier,
            )!.id;
        const item = d.makeItem(id),
          c = {
            x: r.p.x + 12,
            y: r.p.y,
            type: "box",
            name: "纸箱",
            items: [item],
            revealed: 0,
            open: false,
            locked: false,
            cooldown: 0,
          };
        r.containers = [c];
        r.interact();
        g.revealLog = [];
        r.searchProgress = d.searchTime(item) - 0.001;
        r.paused = false;
        r.update(0.02, new Set(), {
          x: r.p.x + 200,
          y: r.p.y - 24,
          down: false,
        });
        r.paused = true;
        return {
          id,
          log: g.revealLog.filter(
            (v: any) =>
              v.key.startsWith("discover-") || v.key.startsWith("unlock-"),
          ),
        };
      },
      { tier, duplicate, weapon },
    );
  for (const tier of [1, 2, 3, 4, 5]) {
    const data = await reveal(tier);
    expect(data.log.map((x: any) => x.key)).toEqual([
      tier >= 4 ? "unlock-" + tier : "discover-" + tier,
    ]);
    expect(data.log[0].gain).toBeCloseTo(1.38, 5);
    await expect(page.locator(".discovery-card")).toHaveAttribute(
      "data-item",
      data.id,
    );
  }
  await page.screenshot({ path: "test-results/chrome-unlock-five.png" });
  for (const tier of [4, 5]) {
    const d = await reveal(tier, true);
    expect(d.log.map((x: any) => x.key)).toEqual(["discover-" + tier]);
  }
  const non = await reveal(1, false, true);
  expect(non.log.map((x: any) => x.key)).toEqual(["discover-2"]);
  await expect(page.locator(".discovery-card")).not.toHaveAttribute(
    "data-item",
    "w3",
  );
  const again = await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    g.revealLog = [];
    r.startSearch(r.containers[0]);
    return g.revealLog.filter(
      (x: any) => x.key.startsWith("discover-") || x.key.startsWith("unlock-"),
    );
  });
  expect(again).toEqual([]);
});
test("空枪切换自动换弹，实际模型卸弹匣、装回、中断复位", async ({ page }) => {
  await enter(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      d = await import("/src/data.ts");
    r.enemies = [];
    g.save.equipment.secondary = d.makeItem("w3");
    g.save.equipment.ammo = d.makeItem("m1", 120);
    r.magazines[g.save.equipment.secondary.uid] = 0;
    r.magazineTiers[g.save.equipment.secondary.uid] = 1;
    r.reload = 0;
  });
  await page.keyboard.press("Digit2");
  expect(
    await page.evaluate(() => (window as any).__game.raid.reload),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    r.paused = true;
    r.reload = r.weapon.reload * 0.55;
    r.p.angle = Math.PI / 2;
    const c = g.renderer3d.camera;
    c.zoom = 2;
    c.updateProjectionMatrix();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__game.renderer3d.actors
            .get("player")
            .gun.getObjectByName("reload-magazine")?.position.y,
      ),
    )
    .toBeLessThan(-13.9);
  const detached = await page.evaluate(() => {
    const g = (window as any).__game,
      rig = g.renderer3d.actors.get("player"),
      mag = rig.gun.getObjectByName("reload-magazine");
    return {
      visible: rig.gun.visible,
      x: mag.position.x,
      y: mag.position.y,
      children: mag.children.length,
      handY: rig.player.arms[1].position.y,
      handDistance: mag
        .getWorldPosition(mag.position.clone())
        .distanceTo(
          rig.player.arms[1].children[0].getWorldPosition(mag.position.clone()),
        ),
    };
  });
  expect(detached.visible).toBe(true);
  expect(detached.handY).toBeLessThan(-7.5);
  expect(detached.handDistance).toBeLessThan(8);
  expect(detached.x).toBeGreaterThan(12);
  expect(detached.children).toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/chrome-reload-magazine-out.png",
  });
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.reload = r.weapon.reload * 0.1;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__game.renderer3d.actors
            .get("player")
            .gun.getObjectByName("reload-magazine").position.y,
      ),
    )
    .toBe(-10);
  await page.screenshot({ path: "test-results/chrome-reload-magazine-in.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.finishReload();
  });
  expect(
    await page.evaluate(() => (window as any).__game.raid.mag),
  ).toBeGreaterThan(0);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.mag = 0;
    r.loadMagazine();
    r.selectWeapon("melee");
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).__game.renderer3d.actors
            .get("player")
            .gun.getObjectByName("reload-magazine").position.y,
      ),
    )
    .toBe(-10);
  expect(await page.evaluate(() => (window as any).__game.raid.reload)).toBe(0);
});
