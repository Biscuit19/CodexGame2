import { describe, it, expect, vi } from "vitest";
import {
  newSave,
  autoLoadout,
  deploymentWarnings,
  validateSave,
} from "../../src/store";
import { damage, armorDur, helmetDur, makeItem, db } from "../../src/data";
import { Raid } from "../../src/raid";
import { projectileTrailLength } from "../../src/combat-visuals";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function start() {
  const s = newSave();
  s.temporary = true;
  const r = new Raid(
    s,
    0,
    { mode: "raid", play: () => {} } as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  r.walls = [];
  r.exits = [];
  r.p.x = 3000;
  r.p.y = 3000;
  return r;
}
describe("护具、配装与战斗细化", () => {
  it("随机默认一次迁移，之后仍保留用户单曲选择", () => {
    const s = newSave();
    expect(s.settings.musicMode).toBe("random");
    expect(s.settings.baseMusicMode).toBe("random");
    delete s.settings.musicShuffleRevision;
    s.settings.musicMode = "loop";
    s.settings.baseMusicMode = "loop";
    const migrated = validateSave(s);
    expect(migrated.settings.musicMode).toBe("random");
    expect(migrated.settings.baseMusicMode).toBe("random");
    migrated.settings.musicMode = "loop";
    expect(validateSave(migrated).settings.musicMode).toBe("loop");
  });
  it("一级弹对完好三级甲约一血，穿甲弹更强，破损护具逐步失效，头盔按自身耐久计算", () => {
    expect(damage(22.4 * 0.62, 1, 3, armorDur[2])).toBeCloseTo(1.0416);
    expect(damage(22.4 * 0.62, 3, 3, armorDur[2])).toBeGreaterThan(7);
    expect(damage(30, 1, 3, 20)).toBeGreaterThan(damage(30, 1, 3, 80));
    expect(damage(30, 1, 3, 0)).toBeCloseTo(22.5);
    expect(
      damage(30, 2, 3, helmetDur[2], true) / damage(30, 2, 3, armorDur[2]),
    ).toBeCloseTo(1.2);
  });
  it("从上往下与其他方向身体弹不再因经过头部轮廓就扣头盔", () => {
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const r = start();
      r.save.equipment.helmet = makeItem("h3");
      r.save.equipment.armor = makeItem("a3");
      const hit = vi.spyOn(r, "hurtPlayer");
      r.addBullet(
        r.p.x - Math.cos(a) * 110,
        r.p.y - 24 - Math.sin(a) * 110,
        a,
        false,
        20,
        1,
      );
      for (let n = 0; n < 20; n++)
        r.update(1 / 120, new Set(), { x: 3300, y: 3000, down: false });
      expect(hit).toHaveBeenCalledTimes(1);
      expect(hit.mock.calls[0][2]).toBe(false);
      expect(r.save.equipment.helmet.durability).toBe(db.h3.durability);
    }
  });
  it("明确瞄头且实际轨迹命中才能使用头盔；目标移动使原瞄头点失效", () => {
    for (const moved of [false, true]) {
      const r = start();
      r.save.equipment.helmet = makeItem("h3");
      r.save.equipment.armor = makeItem("a3");
      const hit = vi.spyOn(r, "hurtPlayer");
      r.addBullet(
        2900,
        2965,
        0,
        false,
        20,
        1,
        800,
        false,
        false,
        { x: 3000, y: 2965 },
        false,
        950,
        true,
      );
      if (moved) r.p.y += 24;
      for (let n = 0; n < 20; n++)
        r.update(1 / 120, new Set(), { x: 3300, y: 3000, down: false });
      if (!moved) {
        expect(hit).toHaveBeenCalledTimes(1);
        expect(hit.mock.calls[0][2]).toBe(true);
      } else expect(hit.mock.calls.every((c) => !c[2])).toBe(true);
    }
  });
  it("一键配装选最低等级现有装备，凑齐120发、食物与护具，重复不消耗、不购买", () => {
    const s = newSave();
    s.temporary = true;
    s.pack = [];
    for (const slot of Object.keys(s.equipment))
      (s.equipment as any)[slot] = null;
    s.stash = ["w3", "w0", "a3", "a1", "h1", "b1", "k0", "f4", "f1"].map((id) =>
      makeItem(id),
    );
    s.stash.push(makeItem("m1", 120));
    const coins = s.coins;
    expect(autoLoadout(s)).toEqual([]);
    expect(deploymentWarnings(s)).toEqual([]);
    expect(s.equipment.primary?.id).toBe("w0");
    expect(s.equipment.armor?.id).toBe("a1");
    expect(s.equipment.food?.id).toBe("f1");
    expect(s.equipment.ammo?.id).toBe("m1");
    expect(s.equipment.ammo?.qty).toBe(120);
    expect(
      ["helmet", "bag", "melee", "secondary"].every(
        (k) => !!(s.equipment as any)[k],
      ),
    ).toBe(true);
    const before = JSON.stringify(s);
    expect(autoLoadout(s)).toEqual([]);
    expect(JSON.stringify(s)).toBe(before);
    expect(s.coins).toBe(coins);
  });
  it("已有高级装备安全放回仓库，换上低级套装，物品与金币不丢失", () => {
    const s = newSave();
    s.temporary = true;
    s.pack = [];
    s.equipment.armor = makeItem("a3");
    s.equipment.helmet = makeItem("h3");
    s.stash.push(makeItem("a1"), makeItem("h1"), makeItem("m1", 120));
    const before = [
      ...s.stash,
      ...s.pack,
      ...Object.values(s.equipment).filter(Boolean),
    ]
      .map((i) => i!.uid)
      .sort();
    expect(autoLoadout(s)).toEqual([]);
    expect(s.equipment.armor?.id).toBe("a1");
    expect(s.equipment.helmet?.id).toBe("h1");
    expect(s.stash.some((i) => i.id === "a3")).toBe(true);
    expect(s.stash.some((i) => i.id === "h3")).toBe(true);
    const after = [
      ...s.stash,
      ...s.pack,
      ...Object.values(s.equipment).filter(Boolean),
    ];
    expect(new Set(after.map((i) => i!.uid)).size).toBe(after.length);
    // Ammunition can merge, while every non-stackable piece must be retained.
    expect(before.length).toBeGreaterThanOrEqual(after.length);
    expect(s.coins).toBe(4500);
  });
  it("物资不足和容量不足明确返回缺项，不凭空补物品", () => {
    const s = newSave();
    s.temporary = true;
    s.stash = [];
    s.pack = [];
    for (const slot of Object.keys(s.equipment))
      (s.equipment as any)[slot] = null;
    const missing = autoLoadout(s);
    expect(missing).toContain("枪械");
    expect(missing.some((x) => x.includes("子弹"))).toBe(true);
    expect(s.stash).toEqual([]);
    expect(s.pack).toEqual([]);
  });
  it("自动补食物在50血以下选最好，50以上选最低，不替换已有手选食物", () => {
    for (const hp of [49, 50]) {
      const r = start();
      r.p.hp = hp;
      r.save.equipment.food = null;
      r.save.pack = ["f1", "f3", "f4"].map((id) => makeItem(id));
      r.ensureFood();
      expect(r.save.equipment.food?.id).toBe(hp < 50 ? "f4" : "f1");
      r.p.hp = 100;
      r.ensureFood();
      expect(r.save.equipment.food?.id).toBe(hp < 50 ? "f4" : "f1");
    }
  });
  it("大多数普通敌人较慢，速度个体固定；战斗追击及技能期间头朝玩家，Boss不环射", () => {
    const r = start();
    const foes = Array.from({ length: 12 }, (_, n) =>
      r.spawn(3000 + n, 3300, 0, 1),
    );
    expect(foes.filter((e) => e.moveScale! <= 1).length).toBe(9);
    const e = foes[0];
    e.state = "combat";
    e.alert = 5;
    e.angle = Math.PI;
    e.cool = 100;
    e.tacticCool = 100;
    e.tactics = [];
    r.p.x = e.x + 350;
    r.p.y = e.y;
    r.updateEnemy(e, 0.02);
    expect(e.angle).toBeCloseTo(0);
    e.maneuver = {
      kind: "dodge",
      stage: "active",
      time: 0,
      shots: 1,
      angle: Math.PI / 2,
      x: 0,
      y: 0,
    };
    r.updateEnemy(e, 0.02);
    expect(Math.abs(e.angle)).toBeLessThan(0.02);
    const boss = r.spawn(3500, 3500, 13, 3, {
      id: "iron",
      name: "铁腮",
      hp: 850,
      weapon: 18,
      skill: "shotgun",
      breed: 13,
      map: 0,
      x: 0,
      y: 0,
    });
    r.p.x = 3900;
    r.p.y = 3500;
    r.bullets = [];
    r.tacticShot(boss, "boss-wide", 0);
    expect(r.bullets).toHaveLength(11);
    expect(r.bullets.every((b) => b.vx > 0)).toBe(true);
  });
  it("普通拖尾27.6、狙击52.8，初始拖尾随飞行距离增长", () => {
    const r = start();
    r.addBullet(3000, 3000, 0, true, 10, 1);
    const b = r.bullets[0];
    b.travel = 100;
    expect(projectileTrailLength(b)).toBeCloseTo(27.6);
    b.longTrail = true;
    expect(projectileTrailLength(b)).toBeCloseTo(52.8);
    b.travel = 0;
    expect(projectileTrailLength(b)).toBeCloseTo(7.2);
  });
});
