import { describe, it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { db, weapons, AMMO_STACK, armorDur, helmetDur } from "../../src/data";
import { villageBuildings } from "../../src/village";
import { projectileColor } from "../../src/combat-visuals";
import type { Sound } from "../../src/audio";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function start(seed = 42, map = 0) {
  const events: string[] = [];
  const sound = {
    mode: "raid",
    play: (name: string) => events.push(name),
  } as unknown as Sound;
  const s = newSave();
  s.temporary = true;
  const r = new Raid(
    s,
    map,
    sound,
    () => {},
    () => {},
    () => {},
    seed,
  );
  return { r, events };
}
describe("战斗压力、听觉和经济", () => {
  it("低级SMG按枪械射速连发，保留快弹速并按武器伤害缩放", () => {
    const { r } = start();
    r.enemies = [];
    r.walls = [];
    const e = r.spawn(3000, 3000, 0, 1);
    e.weapon = 0;
    e.mag = 30;
    e.weaponDurability = db.w0.durability!;
    e.tactics = [];
    e.cool = 0;
    e.state = "combat";
    r.p.x = e.x + 250;
    r.p.y = e.y;
    for (let n = 0; n < 30; n++) r.updateEnemy(e, 1 / 120);
    expect(r.bullets.length).toBeGreaterThanOrEqual(3);
    for (const b of r.bullets) {
      expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(950);
      expect(b.damage).toBeGreaterThan(0);
      expect(b.damage).toBeCloseTo(weapons[0].damage! * 0.62, 1);
    }
    expect(e.mag).toBeLessThanOrEqual(27);
  });
  it("声音只引起警觉和最后声源搜索，目视确认才鸣叫，不反复鸣叫", () => {
    const { r, events } = start();
    r.enemies = [];
    r.walls = [];
    const e = r.spawn(3000, 3000, 0, 1);
    r.p.x = e.x - 150;
    r.p.y = e.y;
    e.turret = true;
    r.walls = [{ x: e.x - 75, y: e.y, w: 20, h: 400, z: 70, color: "#333" }];
    r.alert(r.p.x, r.p.y, 320);
    expect(e.state).toBe("investigate");
    expect(events).not.toContain("enemy-alert");
    const heard = { ...e.target! };
    r.p.x -= 30;
    r.updateEnemy(e, 1 / 60);
    expect(e.target).toEqual(heard);
    expect(r.bullets).toHaveLength(0);
    r.walls = [];
    e.turret = false;
    r.updateEnemy(e, 1 / 60);
    expect(e.state).toBe("combat");
    expect(events.filter((x) => x === "enemy-alert")).toHaveLength(1);
    r.updateEnemy(e, 1 / 60);
    expect(events.filter((x) => x === "enemy-alert")).toHaveLength(1);
  });
  it("脚步能被近处隔墙敌猫听到，静止不制造脚步声", () => {
    const { r } = start();
    r.enemies = [];
    r.walls = [];
    r.exits = [];
    const e = r.spawn(3000, 3000, 0, 1);
    e.turret = true;
    r.p.x = e.x - 150;
    r.p.y = e.y;
    r.walls = [{ x: e.x - 75, y: e.y, w: 20, h: 400, z: 70, color: "#333" }];
    r.update(1 / 60, new Set(), { x: r.p.x - 100, y: r.p.y - 24, down: false });
    expect(e.state).toBe("patrol");
    r.update(1 / 60, new Set(["KeyA"]), {
      x: r.p.x - 100,
      y: r.p.y - 24,
      down: false,
    });
    expect(e.state).toBe("investigate");
  });
  it("预判移动方向且不在飞行中追踪，室内敌人不隔房间向室外开火", () => {
    const { r } = start();
    r.enemies = [];
    r.walls = [];
    const e = r.spawn(3000, 3000, 0, 2);
    r.p.x = e.x + 400;
    r.p.y = e.y;
    r.playerVelocity = { x: 0, y: 220 };
    expect(r.enemyAim(e)).toBeGreaterThan(0.1);
    r.playerVelocity = { x: 0, y: 0 };
    expect(r.enemyAim(e)).toBeCloseTo(0);
    const room = villageBuildings[0];
    e.x = room.x;
    e.y = room.y;
    e.turret = true;
    r.p.x = room.x + room.w / 2 + 50;
    r.p.y = room.y;
    expect(r.enemyCanFire(e)).toBe(false);
    e.state = "combat";
    e.cool = 0;
    e.tacticCool = 0;
    e.maneuver = undefined;
    for (let n = 0; n < 60; n++) r.updateEnemy(e, 1 / 60);
    expect(r.bullets).toHaveLength(0);
    r.p.x = room.x;
    expect(r.enemyCanFire(e)).toBe(true);
  });
  it("铁腮始终3头3甲3弹，六套技能、低血量不切阶段，颜色区别", () => {
    const { r } = start();
    const boss = r.enemies.find((e) => e.boss)!;
    expect(boss.tier).toBe(3);
    expect(boss.armorDurability).toBe(armorDur[2]);
    expect(boss.helmetDurability).toBe(helmetDur[2]);
    r.walls = [];
    r.p.x = boss.x - 180;
    r.p.y = boss.y;
    boss.hp = boss.maxHp * 0.1;
    boss.tacticCool = 100;
    r.updateEnemy(boss, 0.016);
    expect(boss.phase).toBe(0);
    r.tacticShot(boss, "boss-fan", 0);
    expect(
      r.bullets.every(
        (b) => b.tier === 3 && b.boss && Math.hypot(b.vx, b.vy) > 1000,
      ),
    ).toBe(true);
    expect(
      new Set([
        projectileColor({ friendly: true }),
        projectileColor({ friendly: false }),
        projectileColor({ friendly: false, boss: true }),
      ]).size,
    ).toBe(3);
  });
  it("便宜低级枪接近小蓝价值，低级弹保留，3/4级弹涨价", () => {
    expect(
      weapons.filter((w) => w.tier === 1).every((w) => w.price <= 450),
    ).toBe(true);
    expect(
      weapons
        .filter((w) => w.tier === 2)
        .every((w) => w.price >= 700 && w.price <= 1500),
    ).toBe(true);
    expect([1, 2, 3, 4].map((n) => db[`m${n}`].price / AMMO_STACK)).toEqual([
      3, 8, 45, 130,
    ]);
  });
  it("所有地图保险箱与猫窝仅有收集品，武器箱和柜子供应装备子弹", () => {
    let equipment = 0,
      ammo = 0;
    for (let map = 0; map < 4; map++)
      for (let seed = 1; seed < 8; seed++) {
        const { r } = start(seed, map);
        for (const c of r.containers) {
          if (["safe", "bed"].includes(c.type))
            expect(c.items.every((i) => db[i.id].kind === "collectible")).toBe(
              true,
            );
          if (["weapon", "cabinet"].includes(c.type)) {
            equipment += c.items.filter((i) =>
              ["weapon", "armor", "helmet"].includes(db[i.id].kind),
            ).length;
            ammo += c.items.filter((i) => db[i.id].kind === "ammo").length;
          }
        }
      }
    expect(equipment).toBeGreaterThan(0);
    expect(ammo).toBeGreaterThan(0);
  });
});
