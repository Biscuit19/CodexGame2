import { test, expect } from "@playwright/test";
test.use({ video: "on" });
test("B方案圆团三花玩家的连续轮廓、独立四肢和待机动作在Chrome实际渲染", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "新的游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.raid.enemies = [];
    g.raid.p.x = 1000;
    g.raid.p.y = 820;
    g.save.equipment.helmet = d.makeItem("h3");
    g.save.equipment.armor = d.makeItem("a3");
    g.raid.spawn(1100, 1000, 4, 2).cool = 999;
    g.raid.p.angle = Math.PI / 2;
    g.raid.paused = true;
  });
  await page.waitForTimeout(400);
  const inspect = () =>
    page.evaluate(() => {
      const g = (window as any).__game,
        renderer = g.renderer3d;
      const rig = renderer.actors.get("player");
      return {
        scale: rig.root.scale.x,
        eyes: rig.eyes.map((x: any) => x.scale.y),
        tail: rig.tailJoints.map((x: any) => x.rotation.y),
        helmet: rig.helmet.visible,
        vest: rig.vest.visible,
        pack: rig.pack.visible,
        hiddenGearMeshes: [rig.helmet, rig.vest, rig.pack].reduce(
          (n: number, x: any) => n + x.children.length,
          0,
        ),
        wornHelmet: g.save.equipment.helmet.id,
        enemyPlayerRig: !![...renderer.actors.values()].find(
          (r: any) => r !== rig,
        )?.player,
        faceMeshes: rig.head.children
          .filter((x: any) => x.isMesh)
          .map((x: any) => x.name),
        pouch: !!rig.body.getObjectByName("small-cloth-pouch"),
        ears: rig.player.ears.map((x: any) => x.rotation.z),
      };
    });
  const before = await inspect();
  expect(before.scale).toBeLessThan(0.85);
  expect(before.helmet || before.vest || before.pack).toBe(false);
  expect(before.hiddenGearMeshes).toBe(0);
  expect(before.wornHelmet).toBe("h3");
  expect(before.enemyPlayerRig).toBe(false);
  expect(before.faceMeshes).toEqual(["continuous-head-and-ears"]);
  expect(before.pouch).toBe(true);
  expect(before.tail).toHaveLength(6);
  await page.waitForTimeout(200);
  const idle = await inspect();
  expect(idle.tail).not.toEqual(before.tail);
  expect(idle.ears).not.toEqual(before.ears);
  // Observe every rendered frame rather than sampling over RPC and missing brief poses.
  await page.evaluate(() => {
    const rig = (window as any).__game.renderer3d.actors.get("player");
    rig.root.userData.minimumBlink = 1;
    const observe = () => {
      rig.root.userData.minimumBlink = Math.min(
        rig.root.userData.minimumBlink,
        rig.player.face.blink.value,
      );
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as any).__game.renderer3d.actors.get("player").root.userData
              .minimumBlink,
        ),
      { timeout: 12000 },
    )
    .toBeLessThan(0.15);
  await page.screenshot({ path: "test-results/chrome-player-c-normal.png" });
  const poses = await page.evaluate(async () => {
    const g = (window as any).__game,
      rig = g.renderer3d.actors.get("player");
    const d = await import("/src/player-cat.ts");
    return [0.5, 0.5 + Math.PI].map((walk) => {
      d.animatePlayerCat(rig, performance.now() / 1000, walk, 0, 0, 0, 0);
      return {
        arms: rig.player.arms.map((x: any) => x.rotation.x),
        legs: rig.legs.map((x: any) => x.rotation.x),
        head: rig.head.rotation.x,
        sway: rig.body.rotation.z,
      };
    });
  });
  for (const pose of poses) {
    expect(pose.arms[0] * pose.arms[1]).toBeLessThan(0);
    expect(pose.legs[0] * pose.legs[1]).toBeLessThan(0);
    expect(pose.arms[0] * pose.legs[0]).toBeLessThan(0);
    expect(Math.abs(pose.sway)).toBeGreaterThan(0.01);
    expect(Math.abs(pose.head)).toBeLessThan(0.05);
  }
  expect(poses[0].arms[0] * poses[1].arms[0]).toBeLessThan(0);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.renderer3d.camera.zoom = 4;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  for (const [name, angle] of [
    ["front", Math.PI / 2],
    ["quarter", Math.PI / 4],
    ["back", -Math.PI / 2],
  ] as const) {
    await page.evaluate((angle) => {
      (window as any).__game.raid.p.angle = angle;
    }, angle);
    await page.waitForTimeout(180);
    await page.screenshot({ path: `test-results/chrome-player-c-${name}.png` });
  }
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    g.raid.paused = false;
  });
  await page.mouse.move(1100, 880);
  const startX = await page.evaluate(() => (window as any).__game.raid.p.x);
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test-results/chrome-player-c-running.png" });
  await page.keyboard.up("KeyD");
  expect(
    await page.evaluate(() => (window as any).__game.raid.p.x),
  ).toBeGreaterThan(startX + 200);
  const marks = await page.evaluate(() => {
    const g = (window as any).__game;
    return {
      count: g.raid.footprints.length,
      visible: g.renderer3d.pawPrints.marks.filter((m: any) => m.visible)
        .length,
      opacity: g.renderer3d.pawPrints.marks
        .filter((m: any) => m.visible)
        .map((m: any) => m.material.opacity),
    };
  });
  expect(marks.count).toBeGreaterThan(2);
  expect(marks.count).toBeLessThan(12);
  expect(marks.visible).toBeGreaterThan(0);
  expect(marks.opacity.every((n: number) => n > 0 && n <= 0.34)).toBe(true);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.paused = true;
    g.renderer3d.camera.zoom = 2;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  await page.waitForTimeout(120);
  await page.screenshot({ path: "test-results/chrome-player-b-paw-trail.png" });
  await page.evaluate(() => {
    (window as any).__game.raid.paused = false;
  });
  await expect
    .poll(
      () => page.evaluate(() => (window as any).__game.raid.footprints.length),
      { timeout: 10000 },
    )
    .toBe(0);
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() =>
      (window as any).__game.renderer3d.pawPrints.marks.some(
        (m: any) => m.visible,
      ),
    ),
  ).toBe(false);
  await page.evaluate(() => {
    (window as any).__game.raid.paused = true;
  });
  for (const direction of [1, -1]) {
    const rotation = await page.evaluate((direction) => {
      const g = (window as any).__game,
        r = g.raid;
      r.p.angle = direction === 1 ? 0 : Math.PI;
      r.p.roll = 0;
      r.p.rollCooldown = 0;
      r.p.stamina = 100;
      r.roll(1, 0);
      r.p.roll = 0.25;
      const rig = g.renderer3d.actors.get("player");
      g.renderer3d.updateRig(
        rig,
        r.p.x,
        r.p.y,
        r.p.angle,
        0,
        0.25,
        3,
        3,
        true,
        0,
      );
      return {
        x: rig.body.quaternion.x,
        y: rig.body.quaternion.y,
        z: rig.body.quaternion.z,
      };
    }, direction);
    expect(Math.abs(rotation.x)).toBeGreaterThan(0.5);
    expect(Math.abs(rotation.y)).toBeLessThan(0.01);
    await page.screenshot({
      path: `test-results/chrome-cat-roll-${direction}.png`,
    });
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => {
    (window as any).__game.raid.notify("付费撤离测试");
  });
  const box = await page.locator("#toasts").boundingBox();
  expect(box!.y).toBeLessThan(100);
  expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(5);
  expect(errors).toEqual([]);
});
