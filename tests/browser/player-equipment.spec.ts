import { test, expect } from "@playwright/test";

test("矮身三花的五级猫耳头盔护甲背包同步穿脱并保持耳壳随动", async ({
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
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    g.raid.paused = true;
    Object.assign(g.raid.p, { x: 1000, y: 820, angle: Math.PI / 2 });
    g.renderer3d.camera.zoom = 4;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  const scales: number[] = [],
    colors: string[] = [];
  for (let tier = 0; tier <= 5; tier++) {
    await page.evaluate(async (tier) => {
      const g = (window as any).__game,
        d = await import("/src/data.ts");
      for (const [slot, prefix] of [
        ["helmet", "h"],
        ["armor", "a"],
        ["bag", "b"],
      ])
        g.save.equipment[slot] = tier ? d.makeItem(`${prefix}${tier}`) : null;
    }, tier);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as any).__game.renderer3d.actors.get("player").pack.userData
              .tier,
        ),
      )
      .toBe(tier);
    const state = await page.evaluate(() => {
      const g = (window as any).__game,
        rig = g.renderer3d.actors.get("player");
      const head = rig.head.getObjectByName("continuous-head-and-ears");
      const torso = rig.body.getObjectByName("rounded-calico-body");
      head.geometry.computeBoundingBox();
      torso.geometry.computeBoundingBox();
      const bounds = torso.geometry.boundingBox,
        hb = head.geometry.boundingBox;
      const active =
        rig.helmet.children.find((m: any) => m.visible) ||
        rig.helmet.children[0];
      const shell = active.getObjectByName("helmet-shell");
      const shader = {
        uniforms: {},
        vertexShader: "#include <begin_vertex>",
        fragmentShader: "",
      } as any;
      shell.material.onBeforeCompile(shader, g.renderer3d.webgl);
      // Model-space vertical silhouette below the head, compared with the previous 17.5 units.
      const belly =
        rig.head.position.y + hb.min.y - (torso.position.y + bounds.min.y);
      return {
        visible: [rig.helmet.visible, rig.vest.visible, rig.pack.visible],
        parents: [
          rig.helmet.parent === rig.head,
          rig.vest.parent === rig.body,
          rig.pack.parent === rig.body,
        ],
        scale: rig.pack.scale.x,
        color: shell.material.color.getHexString(),
        activeId: active.name,
        activeCount: rig.helmet.children.filter((m: any) => m.visible).length,
        parts: active.children.map((m: any) => m.name),
        bodyWidth: bounds.max.x - bounds.min.x,
        bodyHeight: bounds.max.y - bounds.min.y,
        belly,
        headWidth: hb.max.x - hb.min.x,
        handSize: rig.arms[0].scale.x,
        weaponSize: rig.gun.scale.x,
        synchronized:
          shader.uniforms.catEarL === rig.player.face.earL &&
          shader.uniforms.catEarR === rig.player.face.earR,
        cut: Math.min(
          ...(Array.from(shell.geometry.attributes.position.array).filter(
            (_v, i) => i % 3 === 1,
          ) as number[]),
        ),
      };
    });
    expect(state.visible).toEqual([tier > 0, tier > 0, tier > 0]);
    expect(state.parents).toEqual([true, true, true]);
    expect(state.bodyWidth).toBeCloseTo(32, 1);
    expect(state.bodyHeight).toBeCloseTo(19, 1);
    expect(state.belly).toBeGreaterThan(7);
    expect(state.belly).toBeLessThan(9.5);
    expect(state.headWidth).toBeLessThan(51);
    expect(state.handSize).toBeGreaterThan(1);
    expect(state.weaponSize).toBeCloseTo(0.98 * 0.85, 5);
    expect(state.synchronized).toBe(true);
    expect(state.cut).toBeGreaterThan(9);
    expect(state.cut).toBeLessThan(11);
    expect(state.activeCount).toBe(tier ? 1 : 0);
    if (tier) {
      expect(state.activeId).toBe(`player-helmet-h${tier}`);
      const detail = [
        "chin-strap",
        "tactical-mount",
        "curved-goggle-lens",
        "respirator-vent",
        "black-t-visor",
      ][tier - 1];
      expect(state.parts).toContain(detail);
      expect(state.color).toBe(
        ["aab2b8", "708746", "447abe", "7062a4", "fff0c8"][tier - 1],
      );
    }
    if (tier) {
      scales.push(state.scale);
      colors.push(state.color);
    }
    await page.screenshot({
      path: `test-results/player-fitted-gear-${tier}-front.png`,
    });
    await page.evaluate(() => {
      (window as any).__game.raid.p.angle = -Math.PI / 2;
    });
    await page.waitForTimeout(120);
    await page.screenshot({
      path: `test-results/player-fitted-gear-${tier}-back.png`,
    });
    await page.evaluate(() => {
      (window as any).__game.raid.p.angle = Math.PI / 2;
    });
  }
  expect(new Set(colors).size).toBe(5);
  for (let i = 1; i < scales.length; i++)
    expect(scales[i]).toBeGreaterThan(scales[i - 1]);
  expect(scales[4]).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
