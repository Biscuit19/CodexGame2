import { describe, it, expect } from "vitest";
import { knifeSwingPose } from "../../src/knife-motion";
import { createCatKnife } from "../../src/cat-knife";
import { Mesh } from "three";
import { newSave } from "../../src/store";
import { Raid } from "../../src/raid";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
describe("独立猫爪刀动作", () => {
  it("实际挥砍计数只在允许攻击时递增，冷却/背包不消耗左右交替动作", () => {
    const s = newSave();
    s.temporary = true;
    const r = new Raid(
      s,
      0,
      { play: () => {} } as any,
      () => {},
      () => {},
      () => {},
      42,
    );
    r.activeWeapon = "melee";
    r.enemies = [];
    r.swingMelee();
    expect(r.meleeSwing).toBe(1);
    r.swingMelee();
    expect(r.meleeSwing).toBe(1);
    r.meleeCooldown = 0;
    r.inventory = true;
    r.swingMelee();
    expect(r.meleeSwing).toBe(1);
    r.inventory = false;
    r.swingMelee();
    expect(r.meleeSwing).toBe(2);
  });
  it("两次劈砍从相反侧蓄力，横跨正前方再回位；各阶段连续且刀不投地面阴影", () => {
    for (const side of [1, 2]) {
      const start = knifeSwingPose(0.45, side),
        end = knifeSwingPose(0, side);
      expect(start.yaw).toBeCloseTo(0);
      expect(end.yaw).toBeCloseTo(0);
      const values = Array.from({ length: 451 }, (_, n) =>
        knifeSwingPose(0.45 - n / 1000, side),
      );
      expect(Math.min(...values.map((p) => p.yaw))).toBeLessThan(-0.6);
      expect(Math.max(...values.map((p) => p.yaw))).toBeGreaterThan(0.6);
      for (let n = 1; n < values.length; n++)
        expect(Math.abs(values[n].yaw - values[n - 1].yaw)).toBeLessThan(0.03);
    }
    for (const time of [0.1, 0.23, 0.36]) {
      const a = knifeSwingPose(time, 1),
        b = knifeSwingPose(time, 2);
      expect(a.yaw).toBeCloseTo(-b.yaw);
      expect(a.shoulder).toBeCloseTo(-b.shoulder);
    }
    const k = createCatKnife();
    let meshes = 0;
    k.traverse((o) => {
      if (o instanceof Mesh) {
        meshes++;
        expect(o.castShadow).toBe(false);
      }
    });
    expect(meshes).toBeGreaterThan(10);
  });
});
