import { describe, it, expect } from "vitest";
import { Raid, VILLAGE_TACTICS } from "../../src/raid";
import { newSave } from "../../src/store";
import { villageBuildings, inBuilding } from "../../src/village";
import type { Sound } from "../../src/audio";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
const sound = { mode: "raid", play: () => {} } as unknown as Sound;
function start(seed = 42) {
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
describe("乡野战术与建筑外出生", () => {
  it("多种子与直接房间内请求均将全部敌猫和Boss放在房屋外", () => {
    for (const seed of [1, 42, 85, 1000]) {
      const r = start(seed);
      expect(r.enemies.length).toBeGreaterThanOrEqual(20);
      for (const e of r.enemies) {
        expect(villageBuildings.some((b) => inBuilding(b, e.x, e.y, 39))).toBe(
          false,
        );
        expect(r.blocked(e.x, e.y, 24)).toBe(false);
      }
      for (const b of villageBuildings) {
        const e = r.spawn(b.x, b.y, 0, 1);
        expect(villageBuildings.some((b) => inBuilding(b, e.x, e.y, 39))).toBe(
          false,
        );
      }
    }
  });
  it("地图一实际敌群覆盖16种战术，低级不分配精锐蓄力与扫射，其他地图不启用", () => {
    const r = start();
    const used = new Set(
      r.enemies.filter((e) => !e.boss).flatMap((e) => [...(e.tactics ?? [])]),
    );
    expect([...used].sort()).toEqual([...VILLAGE_TACTICS].sort());
    expect(
      r.enemies
        .filter((e) => e.tier === 1)
        .every(
          (e) => !e.tactics?.includes("sweep") && !e.tactics?.includes("aim"),
        ),
    ).toBe(true);
    const s = newSave();
    s.temporary = true;
    const other = new Raid(
      s,
      1,
      sound,
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(other.enemies.every((e) => !e.tactics)).toBe(true);
    for (const e of other.enemies)
      for (const [x, y, w, h] of other.rooms) {
        expect(
          Math.abs(e.x - x) < w / 2 + 39 && Math.abs(e.y - y) < h / 2 + 39,
        ).toBe(false);
      }
  });
  it("所有射击招式先预警再按节奏发弹，普通招式耗弹且不会连发无上限", () => {
    for (const kind of ["burst", "fan", "double", "aim", "sweep"] as const) {
      const r = start();
      r.enemies = [];
      r.walls = [];
      const e = r.spawn(3000, 3000, 3, 2);
      r.p.x = e.x + 250;
      r.p.y = e.y;
      e.state = "combat";
      e.tactics = [kind];
      e.tacticCool = 0;
      const before = e.mag;
      expect(r.updateVillageTactics(e, 0.016, true)).toBe(true);
      expect(e.maneuver?.stage).toBe("warn");
      expect(r.bullets.length).toBe(0);
      for (let n = 0; n < 180; n++) r.updateVillageTactics(e, 1 / 60, true);
      expect(r.bullets.length).toBeGreaterThan(0);
      expect(r.bullets.length).toBeLessThanOrEqual(5);
      expect(e.mag).toBeLessThan(before);
      expect(e.maneuver).toBeUndefined();
      expect(e.tacticCool).toBeGreaterThan(0);
    }
  });
  it("低级追击更快接近，精锐会撤步保持距离并对来弹侧闪", () => {
    const r = start();
    r.enemies = [];
    r.walls = [];
    r.exits = [];
    const e = r.spawn(3000, 3000, 0, 1);
    r.p.x = e.x + 200;
    r.p.y = e.y;
    e.state = "combat";
    e.tactics = ["pursuit"];
    e.cool = 100;
    e.tacticCool = 100;
    const before = Math.hypot(e.x - r.p.x, e.y - r.p.y);
    for (let n = 0; n < 15; n++) r.updateEnemy(e, 1 / 60);
    expect(Math.hypot(e.x - r.p.x, e.y - r.p.y)).toBeLessThan(before - 15);
    e.tactics = ["kite"];
    const near = Math.hypot(e.x - r.p.x, e.y - r.p.y);
    for (let n = 0; n < 15; n++) r.updateEnemy(e, 1 / 60);
    expect(Math.hypot(e.x - r.p.x, e.y - r.p.y)).toBeGreaterThan(near);
    e.tactics = ["dodge"];
    e.tacticCool = 0;
    r.addBullet(e.x - 100, e.y - 24, 0, true, 10, 1, 500);
    r.updateVillageTactics(e, 0.016, true);
    expect(e.maneuver?.kind).toBe("dodge");
  });
  it("铁腮六招循环、三阶护具弹药、血量降低不切阶段", () => {
    const r = start();
    r.walls = [];
    const boss = r.enemies.find((e) => e.boss)!;
    r.p.x = boss.x - 180;
    r.p.y = boss.y + 80;
    boss.state = "combat";
    const kinds = [];
    for (let cycle = 0; cycle < 6; cycle++) {
      boss.tacticCool = 0;
      r.bullets = [];
      r.updateVillageTactics(boss, 0.016, true);
      kinds.push(boss.maneuver!.kind);
      expect(boss.maneuver!.stage).toBe("warn");
      expect(r.bullets.length).toBe(0);
      for (let n = 0; n < 220; n++) r.updateVillageTactics(boss, 1 / 60, true);
      expect(r.bullets.length).toBeGreaterThan(0);
      expect(r.bullets.length).toBeLessThanOrEqual(21);
      expect(boss.maneuver).toBeUndefined();
    }
    expect(kinds).toEqual([
      "boss-fan",
      "boss-roll",
      "tracking-burst",
      "boss-ring",
      "advance-burst",
      "crossfire",
    ]);
    expect(boss.tier).toBe(3);
    const l = boss.leash!;
    expect(Math.abs(boss.x - l.x)).toBeLessThanOrEqual(l.w / 2);
    expect(Math.abs(boss.y - l.y)).toBeLessThanOrEqual(l.h / 2);
    boss.hp = boss.maxHp * 0.2;
    r.updateEnemy(boss, 1 / 60);
    expect(boss.phase).toBe(0);
    boss.tacticCool = 0;
    r.updateVillageTactics(boss, 0.016, true);
    expect(boss.tacticCool).toBe(4.2);
  });
  it("冲刺闪避受实体墙和水域约束，不瞬移穿墙；失去视线不凭空开启招式", () => {
    const r = start();
    r.walls = [];
    r.enemies = [];
    const e = r.spawn(3000, 3000, 3, 2);
    e.leash = undefined;
    r.walls = [{ x: e.x + 45, y: e.y, w: 20, h: 500, z: 50, color: "#333" }];
    const old = e.x;
    r.tacticalMove(e, 0, 400);
    expect(e.x).toBeLessThan(old + 35);
    expect(r.blocked(e.x, e.y)).toBe(false);
    e.tacticCool = 0;
    e.state = "combat";
    e.tactics = ["fan"];
    expect(r.updateVillageTactics(e, 0.016, false)).toBe(false);
    expect(e.maneuver).toBeUndefined();
  });
});
