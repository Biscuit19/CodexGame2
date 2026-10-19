import { test, expect } from "@playwright/test";

test("玩家实际前进后退左右移动使用对应步态，手脚交替且停止后复位", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口" }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  const samples: Record<string, any> = {};
  for (const [name, key] of [
    ["forward", "KeyS"],
    ["backward", "KeyW"],
    ["left", "KeyD"],
    ["right", "KeyA"],
  ]) {
    await page.evaluate(() => {
      const g = (window as any).__game,
        r = g.raid;
      r.enemies = [];
      r.paused = true;
      r.p.x = 1000;
      r.p.y = 820;
      r.p.angle = Math.PI / 2;
      r.p.walk = 0;
      r.p.stamina = 100;
      r.p.exhausted = false;
      g.renderer3d.camera.zoom = 1;
      g.renderer3d.camera.updateProjectionMatrix();
    });
    await page.waitForTimeout(100);
    const pointer = await page.evaluate(() => {
      const p = (window as any).__game.renderer3d.project(1000, 1150, 28);
      return { x: p.x, y: p.y };
    });
    await page.mouse.move(pointer.x, pointer.y);
    await page.evaluate(() => {
      (window as any).__game.raid.paused = false;
    });
    await page.keyboard.down(key);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const p = (window as any).__game.raid.p;
          return Math.hypot(p.x - 1000, p.y - 820);
        }),
      )
      .toBeGreaterThan(20);
    await page.evaluate(() => {
      (window as any).__game.raid.paused = true;
    });
    await page.keyboard.up(key);
    const sample = await page.evaluate(async () => {
      const g = (window as any).__game,
        r = g.raid,
        rig = g.renderer3d.actors.get("player");
      const { movementFrame } = await import("/src/locomotion.ts");
      const { animatePlayerCat } = await import("/src/player-cat.ts");
      const phases = [0.7, 0.7 + Math.PI].map((phase) => {
        animatePlayerCat(
          rig,
          performance.now() / 1000,
          phase,
          r.p.angle,
          0,
          0,
          0,
          r.p.moveAngle,
        );
        return {
          legs: rig.legs.map((leg: any) => ({
            x: leg.rotation.x,
            z: leg.rotation.z,
            lift: leg.position.y,
          })),
          arms: rig.arms.map((arm: any) => ({
            x: arm.rotation.x,
            z: arm.rotation.z,
          })),
          head: rig.head.rotation.x,
          bodyX: rig.body.rotation.x,
          bodyZ: rig.body.rotation.z,
        };
      });
      r.p.walk = 0.7;
      g.renderer3d.camera.zoom = 3;
      g.renderer3d.camera.updateProjectionMatrix();
      return { kind: movementFrame(r.p.angle, r.p.moveAngle).kind, phases };
    });
    expect(sample.kind).toBe(name);
    const [a, b] = sample.phases;
    expect(a.legs[0].lift).not.toBe(a.legs[1].lift);
    expect(a.legs[0].lift).toBeCloseTo(b.legs[1].lift);
    if (name === "forward" || name === "backward") {
      expect(Math.abs(a.legs[0].x)).toBeGreaterThan(0.2);
      expect(a.legs[0].x * a.legs[1].x).toBeLessThan(0);
      expect(a.arms[0].x * a.legs[0].x).toBeLessThan(0);
      expect(a.legs[0].x * b.legs[0].x).toBeLessThan(0);
    } else {
      expect(Math.abs(a.legs[0].z)).toBeGreaterThan(0.2);
      expect(Math.abs(a.legs[0].x)).toBeLessThan(0.12);
      expect(a.legs[0].z * a.legs[1].z).toBeLessThan(0);
      expect(a.legs[0].z * b.legs[0].z).toBeLessThan(0);
      expect((a.arms[0].z - 0.06) * a.legs[0].z).toBeLessThan(0);
    }
    samples[name] = a;
    await page.waitForTimeout(100);
    await page.screenshot({ path: `test-results/player-gait-${name}.png` });
  }
  expect(samples.forward.legs[0].x * samples.backward.legs[0].x).toBeLessThan(
    0,
  );
  expect(samples.forward.bodyX * samples.backward.bodyX).toBeLessThan(0);
  expect(samples.forward.head * samples.backward.head).toBeLessThan(0);
  expect(samples.left.legs[0].z * samples.right.legs[0].z).toBeLessThan(0);
  const rest = await page.evaluate(async () => {
    const g = (window as any).__game,
      rig = g.renderer3d.actors.get("player");
    const { animatePlayerCat } = await import("/src/player-cat.ts");
    animatePlayerCat(rig, performance.now() / 1000, 0, 0, 0, 0, 0, Math.PI / 2);
    g.raid.p.walk = 0;
    return rig.legs.map((leg: any) => ({
      x: leg.rotation.x,
      z: leg.rotation.z,
      y: leg.position.y,
    }));
  });
  for (const leg of rest) {
    expect(leg.x).toBeCloseTo(0);
    expect(leg.z).toBeCloseTo(0);
    expect(leg.y).toBe(-24);
  }
  expect(errors).toEqual([]);
});
