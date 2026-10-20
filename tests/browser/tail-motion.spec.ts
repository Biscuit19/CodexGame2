import { acceptPreflightIfPresent } from "./helpers/deploy";
import { test, expect } from "@playwright/test";

test("尾巴贴近身体并从各级背包下方伸出，随机摆动及翻滚不穿头包", async ({
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
  await acceptPreflightIfPresent(page);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    g.raid.paused = true;
    Object.assign(g.raid.p, { x: 1000, y: 820, angle: -Math.PI / 2 });
    g.renderer3d.camera.zoom = 4;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  await page.waitForTimeout(120);
  const data = await page.evaluate(async () => {
    const g = (window as any).__game,
      rig = g.renderer3d.actors.get("player");
    const { animatePlayerCat, updatePlayerEquipment } =
      await import("/src/player-cat.ts");
    const surface = rig.tail.getObjectByName("continuous-tail-surface");
    const vertices = surface.geometry.attributes.position;
    const indices = surface.geometry.index.array;
    const normals = surface.geometry.attributes.normal;
    const a = rig.tail.position.clone(),
      b = a.clone(),
      c = a.clone(),
      n = a.clone();
    const vertex = rig.tail.position.clone(),
      world = vertex.clone();
    const firstGeometry = rig.pack.children[0].geometry;
    if (!firstGeometry.boundingBox) firstGeometry.computeBoundingBox();
    const packBounds = firstGeometry.boundingBox.clone();
    packBounds.makeEmpty();
    for (const child of rig.pack.children) {
      child.updateMatrix();
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      packBounds.union(
        child.geometry.boundingBox.clone().applyMatrix4(child.matrix),
      );
    }
    const time = performance.now() / 1000;
    let facing = Infinity,
      clearance = Infinity,
      packClearance = Infinity,
      rootBelowPack = Infinity,
      farthestBack = 0,
      rootMin = Infinity,
      rootMax = -Infinity,
      foreMin = Infinity,
      foreMax = -Infinity;
    const directions = new Set<number>();
    // Inspect the actual tail vertices in head-local space, including both flanks and the sole side.
    for (let i = 0; i < 600; i++) {
      const bagTier = Math.floor(i / 100);
      updatePlayerEquipment(rig, 1, 1, bagTier);
      const walk = i % 3 === 0 ? 0 : i * 0.23 + 0.7;
      const roll = i % 4 === 0 ? 0.25 : 0;
      animatePlayerCat(
        rig,
        time + i * 0.2,
        walk,
        i * 0.1,
        roll,
        i * 0.37,
        i * 0.1,
        i * 0.15,
      );
      rig.root.updateMatrixWorld(true);
      a.fromBufferAttribute(vertices, indices[0]);
      b.fromBufferAttribute(vertices, indices[1]).sub(a);
      c.fromBufferAttribute(vertices, indices[2]).sub(a);
      n.fromBufferAttribute(normals, indices[0]);
      facing = Math.min(facing, b.cross(c).normalize().dot(n));
      const centers = [0, 1, 4, 5].map((index) =>
        rig.body.worldToLocal(
          rig.tailJoints[index].getWorldPosition(
            rig.tailJoints[index].position.clone(),
          ),
        ),
      );
      rootMin = Math.min(rootMin, centers[1].x);
      rootMax = Math.max(rootMax, centers[1].x);
      foreMin = Math.min(foreMin, centers[1].y - centers[0].y);
      foreMax = Math.max(foreMax, centers[1].y - centers[0].y);
      const heading = Math.atan2(
        centers[3].z - centers[2].z,
        centers[3].x - centers[2].x,
      );
      directions.add(Math.floor((heading + Math.PI) / (Math.PI / 4)) % 8);
      for (let j = 0; j < vertices.count; j++) {
        world
          .fromBufferAttribute(vertices, j)
          .applyMatrix4(surface.matrixWorld);
        vertex.copy(world);
        rig.head.worldToLocal(vertex);
        const distance =
          (vertex.x / 26) ** 2 + (vertex.y / 18) ** 2 + (vertex.z / 18) ** 2;
        clearance = Math.min(clearance, distance);
        vertex.copy(world);
        rig.body.worldToLocal(vertex);
        farthestBack = Math.max(farthestBack, -vertex.z);
        if (rig.pack.visible) {
          vertex.copy(world);
          rig.pack.worldToLocal(vertex);
          packClearance = Math.min(
            packClearance,
            packBounds.distanceToPoint(vertex),
          );
          if (j < 13)
            rootBelowPack = Math.min(
              rootBelowPack,
              packBounds.min.y - vertex.y,
            );
        }
      }
    }
    rig.player.blinkLast = 0;
    rig.player.blinkElapsed = -1;
    rig.player.blinkAt = 0;
    return {
      clearance,
      packClearance,
      rootBelowPack,
      farthestBack,
      facing,
      rootMin,
      rootMax,
      foreMin,
      foreMax,
      directions: directions.size,
    };
  });
  expect(data.directions).toBe(8);
  expect(data.rootMin).toBeLessThan(-7);
  expect(data.rootMax).toBeGreaterThan(7);
  expect(data.foreMax - data.foreMin).toBeGreaterThan(0.7);
  expect(data.clearance).toBeGreaterThan(1.01);
  expect(data.facing).toBeGreaterThan(0.8);
  expect(data.packClearance).toBeGreaterThan(0.1);
  expect(data.rootBelowPack).toBeGreaterThan(0.05);
  expect(data.farthestBack).toBeLessThan(36);
  await page.waitForTimeout(120);
  await page.screenshot({ path: "test-results/tail-random-back.png" });
  await page.evaluate(() => {
    (window as any).__game.raid.p.angle = Math.PI / 4;
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: "test-results/tail-random-quarter.png" });
  expect(errors).toEqual([]);
});
