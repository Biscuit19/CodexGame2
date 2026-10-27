import { describe, it, expect } from "vitest";
import { Raid, projectileHitsHead } from "../../src/raid";
import { newSave, beginRaid, cancelRaid } from "../../src/store";
import { db, makeItem, damage, weapons } from "../../src/data";
import type { Sound } from "../../src/audio";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
const sound = { mode: "raid", play: () => {} } as unknown as Sound;
function raid(seed = 42) {
  const s = newSave();
  s.temporary = true;
  return new Raid(
    s,
    0,
    sound,
    () => {},
    () => {},
    () => {},
    seed,
  );
}
describe("搜索与战斗平衡修订", () => {
  it("入局缺包补发b1，已有包保留，退出恢复且不生成重复背包", () => {
    const s = newSave();
    s.temporary = true;
    s.equipment.bag = null;
    const stash = s.stash.length;
    expect(beginRaid(s)).toBe(true);
    expect(s.equipment.bag?.id).toBe("b1");
    expect(s.stash.length).toBe(stash);
    expect(beginRaid(s)).toBe(false);
    expect(cancelRaid(s)).toBe(true);
    expect(s.equipment.bag).toBeNull();
    s.equipment.bag = makeItem("b4");
    const uid = s.equipment.bag.uid;
    beginRaid(s);
    expect(s.equipment.bag.uid).toBe(uid);
  });
  it("侧面左右子弹均可穿过头部，腹部与远离目标弹道不算爆头", () => {
    const actor = { x: 500, y: 500 };
    expect(projectileHitsHead({ x: 478, y: 476, vx: 1000, vy: 0 }, actor)).toBe(
      true,
    );
    expect(
      projectileHitsHead({ x: 522, y: 476, vx: -1000, vy: 0 }, actor),
    ).toBe(true);
    expect(projectileHitsHead({ x: 500, y: 450, vx: 0, vy: 1000 }, actor)).toBe(
      true,
    );
    expect(projectileHitsHead({ x: 478, y: 491, vx: 1000, vy: 0 }, actor)).toBe(
      false,
    );
    expect(
      projectileHitsHead({ x: 500, y: 498, vx: 0, vy: -1000 }, actor),
    ).toBe(false);
    expect(
      projectileHitsHead({ x: 478, y: 476, vx: -1000, vy: 0 }, actor),
    ).toBe(false);
    expect(damage(30, 2, 2, 100, true) / damage(30, 2, 2, 100)).toBeCloseTo(
      1.2,
    );
  });
  it("真实水平飞弹命中左右脸均触发头盔扣损而非护甲扣损", () => {
    for (const direction of [-1, 1]) {
      const r = raid();
      r.enemies = [];
      r.walls = [];
      const e = r.spawn(3000, 3000, 0, 1);
      e.cool = 100;
      r.p.x = e.x - direction * 200;
      r.p.y = e.y;
      const armor = e.armorDurability,
        helmet = e.helmetDurability;
      r.addBullet(
        e.x - direction * 28,
        e.y - 24,
        direction === 1 ? 0 : Math.PI,
        true,
        10,
        1,
        500,
      );
      r.update(1 / 60, new Set(), { x: e.x, y: e.y - 24, down: false });
      expect(e.helmetDurability).toBeLessThan(helmet);
      expect(e.armorDurability).toBe(armor);
    }
  });
  it("下方及斜下方瞄头的真实射击等到头部再命中，身体瞄准仍伤护甲", () => {
    for (const offsetX of [-120, 0, 120])
      for (const head of [false, true]) {
        const r = raid();
        r.enemies = [];
        r.walls = [];
        r.exits = [];
        r.updateEnemy = () => {}; // Stationary target, as specified by the aiming rule.
        const e = r.spawn(3000, 3000, 0, 1);
        r.p.x = e.x + offsetX;
        r.p.y = e.y + 200;
        r.save.equipment.primary = makeItem("w9");
        r.activeWeapon = "primary";
        r.mag = 5;
        r.reload = 0;
        r.fireCool = 0;
        const armor = e.armorDurability,
          helmet = e.helmetDurability;
        r.update(1 / 60, new Set(), {
          x: e.x,
          y: e.y - (head ? 35 : 5),
          down: true,
        });
        expect(r.bullets).toHaveLength(1);
        // Changing the cursor after firing must not steer the projectile.
        for (let n = 0; n < 25; n++)
          r.update(1 / 60, new Set(), { x: 4000, y: 4000, down: false });
        if (head) {
          expect(e.helmetDurability).toBeLessThan(helmet);
          expect(e.armorDurability).toBe(armor);
        } else {
          expect(e.armorDurability).toBeLessThan(armor);
          expect(e.helmetDurability).toBe(helmet);
        }
      }
  });
  it("瞄头不锁敌：目标移走会射空，墙壁仍拦截瞄头子弹", () => {
    for (const wall of [false, true]) {
      const r = raid();
      r.enemies = [];
      r.walls = [];
      r.exits = [];
      r.updateEnemy = () => {};
      const e = r.spawn(3000, 3000, 0, 1);
      r.p.x = e.x;
      r.p.y = e.y + 200;
      r.save.equipment.primary = makeItem("w9");
      r.activeWeapon = "primary";
      r.mag = 5;
      r.reload = 0;
      if (wall)
        r.walls = [{ x: 3000, y: 3120, w: 120, h: 20, z: 40, color: "#888" }];
      r.update(1 / 60, new Set(), { x: e.x, y: e.y - 35, down: true });
      if (!wall) e.x += 100;
      for (let n = 0; n < 25; n++)
        r.update(1 / 60, new Set(), { x: 4000, y: 4000, down: false });
      expect(e.hp).toBe(e.maxHp);
    }
  });
  it("伤害降低，富资源区更耐打，低级弹对Boss护甲明显弱于高级弹", () => {
    expect(db.w0.damage).toBe(14);
    expect(db.w3.damage).toBe(22);
    expect(weapons.every((w) => w.damage! > 0)).toBe(true);
    const r = raid(),
      ordinary = r.enemies.find((e) => e.squad === "hunter")!,
      barn = r.enemies.find((e) => e.squad === "barn" && e.tier === 1)!,
      guard = r.enemies.find((e) => e.squad === "boss-inner" && !e.boss)!,
      boss = r.enemies.find((e) => e.boss)!;
    expect(ordinary.maxHp).toBe(92);
    expect(barn.maxHp).toBeGreaterThan(ordinary.maxHp);
    expect(guard.maxHp).toBeGreaterThan(barn.maxHp);
    expect(boss.maxHp).toBe(850);
    const low = damage(db.w0.damage!, 1, boss.tier, boss.armorDurability);
    const high = damage(db.w0.damage!, 4, boss.tier, boss.armorDurability);
    expect(high / low).toBeGreaterThan(3);
    expect(low / boss.maxHp).toBeLessThan(0.005);
  });
  it("地图一传说确实可掉落且集中在谷仓与Boss区，出生区不出高价值", () => {
    let legendary = 0;
    const regions = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const r = raid(seed);
      for (const c of r.containers)
        for (const i of c.items) {
          const d = db[i.id];
          if (d.kind === "collectible" && d.tier === 5) {
            legendary++;
            regions.add(c.region!);
          }
          if (c.region === "spawn" && d.kind === "collectible")
            expect(d.tier).toBe(1);
        }
    }
    expect(legendary).toBeGreaterThan(10);
    expect(
      [...regions].every((r) => ["barn", "boss-yard", "boss"].includes(r)),
    ).toBe(true);
  });
});
