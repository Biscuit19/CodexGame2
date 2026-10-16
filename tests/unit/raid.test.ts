import { beforeEach, describe, it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave, recoverInterrupted, validateSave } from "../../src/store";
import { makeItem, weapons, db } from "../../src/data";
import type { Sound } from "../../src/audio";
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  },
  window: {},
});
const sound = { mode: "base", play: () => {} } as unknown as Sound;
function start(map = 0) {
  const s = newSave(),
    r = new Raid(
      s,
      map,
      sound,
      () => {},
      () => {},
      () => {},
      42,
    );
  r.enemies = [];
  return { s, r };
}
function advance(r: Raid, seconds: number, keys = new Set<string>()) {
  for (let i = 0; i < seconds * 60; i++)
    r.update(1 / 60, keys, { x: r.p.x + 200, y: r.p.y - 24, down: false });
}
beforeEach(() => memory.clear());
describe("真实战区逻辑", () => {
  it("新存档默认标准模式，暂停退出完整返还弹药、耐久、金币和新物品", () => {
    const s = newSave();
    expect(s.mode).toBe("standard");
    const before = structuredClone(s);
    const r = new Raid(
      s,
      0,
      sound,
      () => {},
      () => {},
      () => {},
      41,
    );
    s.coins -= 600;
    s.equipment.armor!.durability = 3;
    s.collection.push("c4_0");
    s.pack.push(makeItem("c4_0"));
    s.secure.push(makeItem("c3_0"));
    r.mag = 1;
    r.pendingBosses.push("iron");
    expect(r.abort()).toBe(true);
    expect(r.done).toBe(true);
    const { updated: _, ...after } = s;
    const { updated: __, ...original } = before;
    expect(after).toEqual(original);
    expect(r.abort()).toBe(false);
  });
  it("切换疾跑在松开 Shift 后继续，第二次切换恢复行走", () => {
    const { r } = start();
    r.p.x = 1000;
    r.p.y = 1550;
    r.sprintToggled = true;
    advance(r, 0.2, new Set(["KeyD"]));
    const x = r.p.x;
    expect(r.p.stamina).toBeLessThan(160);
    r.sprintToggled = false;
    advance(r, 0.2, new Set(["KeyD"]));
    expect(r.p.x - x).toBeCloseTo(28, 1);
  });
  it("容器即时打开，只有内含物逐件计时，同时打开背包", () => {
    const { r } = start(),
      c = r.containers[0];
    r.p.x = c.x;
    r.p.y = c.y;
    r.interact();
    expect(r.search).toBe(c);
    expect(r.inventory).toBe(true);
    expect(c.revealed).toBe(0);
    expect(c.open).toBe(true);
  });
  it("四张地图的首领与撤离点均可从出生点步行抵达，敌人不会刷在墙内", () => {
    for (let map = 0; map < 4; map++) {
      const s = newSave();
      s.defeated = ["iron", "swift", "yeed", "maine", "frost"];
      const r = new Raid(
        s,
        map,
        sound,
        () => {},
        () => {},
        () => {},
        85,
      );
      const queue = [{ x: 260, y: 1460 }],
        visited = new Set(["260,1460"]);
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        for (const [dx, dy] of [
          [40, 0],
          [-40, 0],
          [0, 40],
          [0, -40],
        ]) {
          const x = p.x + dx,
            y = p.y + dy,
            key = `${x},${y}`;
          if (visited.has(key) || r.blocked(x, y, 16)) continue;
          visited.add(key);
          queue.push({ x, y });
        }
      }
      const reachable = (x: number, y: number) =>
        queue.some(
          (p) =>
            Math.hypot(p.x - x, p.y - y) < 65 && r.lineClear(p.x, p.y, x, y),
        );
      for (const e of r.enemies) {
        expect(r.blocked(e.x, e.y), `${map}:${e.id} spawn`).toBe(false);
        if (e.boss)
          expect(reachable(e.x, e.y), `${map}:${e.id} path`).toBe(true);
      }
      for (const ex of r.exits)
        expect(reachable(ex.x, ex.y), `${map}:${ex.name}`).toBe(true);
      for (const c of r.containers)
        expect(
          queue.some(
            (p) =>
              Math.hypot(p.x - c.x, p.y - c.y) < 90 &&
              r.lineClear(p.x, p.y, c.x, c.y),
          ),
          `${map}:${c.name}`,
        ).toBe(true);
    }
  });
  it("12 把武器都能发射、换弹后继续射击，翻滚结束不会卡死", () => {
    for (const w of weapons) {
      const { s, r } = start();
      s.equipment.primary = makeItem(w.id);
      r.magazines[s.equipment.primary.uid] = 1;
      r.fireCool = 0;
      const count = r.stats.damageDealt;
      r.shoot();
      expect(r.mag).toBe(0);
      expect(r.bullets).toHaveLength(1);
      r.loadMagazine();
      advance(r, 4);
      expect(r.reload).toBe(0);
      expect(r.mag).toBe(w.mag);
      r.roll(1, 0);
      advance(r, 1);
      expect(r.p.roll).toBe(0);
      r.shoot();
      expect(r.mag).toBe(w.mag! - 1);
      expect(count).toBe(0);
    }
  });
  it("行走可进食，奔跑或受击会打断，完成后能再次吃食物", () => {
    const { s, r } = start();
    r.p.hp = 30;
    r.useFood();
    advance(r, 1.2, new Set(["KeyD"]));
    expect(r.p.hp).toBe(50);
    expect(r.heal).toBe(0);
    r.useFood();
    advance(r, 1.6);
    expect(r.p.hp).toBe(85);
    s.pack.push(makeItem("f3"));
    r.useFood();
    r.sprintToggled = true;
    advance(r, 0.1, new Set(["KeyD"]));
    expect(r.heal).toBe(0);
  });
  it("真实弹道能击中敌人并生成带装备的战利品", () => {
    const { r } = start();
    r.p.x = 1000;
    r.p.y = 1000;
    r.p.angle = 0;
    const e = r.spawn(1150, 1000, 0, 1);
    e.cool = 999;
    for (let i = 0; i < 10 && r.enemies.includes(e); i++) {
      r.fireCool = 0;
      r.p.angle = Math.atan2(e.y - r.p.y, e.x - r.p.x);
      r.shoot();
      advance(r, 0.2);
    }
    expect(r.enemies.includes(e)).toBe(false);
    expect(r.stats.kills).toBe(1);
    const corpse = r.containers.find((c) => c.type === "corpse")!;
    expect(corpse.items.some((i) => db[i.id].kind === "weapon")).toBe(true);
    expect(corpse.items.some((i) => db[i.id].kind === "armor")).toBe(true);
  });
  it("撤离要连续停留五秒，离圈重置，付费点先扣款一次", () => {
    const { s, r } = start(),
      ex = r.exits[2],
      coins = s.coins;
    r.p.x = ex.x;
    r.p.y = ex.y;
    advance(r, 2);
    expect(r.extract).toBe(0);
    r.interact();
    expect(s.coins).toBe(coins - 600);
    r.interact();
    expect(s.coins).toBe(coins - 600);
    advance(r, 3);
    expect(r.done).toBe(false);
    r.p.x -= 100;
    advance(r, 0.1);
    expect(r.extract).toBe(0);
    r.p.x += 100;
    advance(r, 5.2);
    expect(r.done).toBe(true);
    expect(s.stats.extracts).toBe(1);
  });
  it("医生只在两把永久密钥均存在时生成，不要求一局全打完", () => {
    const s = newSave();
    s.defeated = ["iron", "swift", "yeed"];
    const r = new Raid(
      s,
      3,
      sound,
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(r.enemies.filter((e) => e.boss).map((e) => e.id)).toEqual([
      "maine",
      "frost",
    ]);
    r.pendingBosses = ["maine", "frost"];
    r.finish(true, "test");
    expect(s.defeated).toContain("maine");
    expect(s.defeated).toContain("frost");
    const again = new Raid(
      s,
      3,
      sound,
      () => {},
      () => {},
      () => {},
      43,
    );
    expect(again.enemies.filter((e) => e.boss).map((e) => e.id)).toEqual([
      "maine",
      "frost",
      "doctor",
    ]);
  });
  it("40 发弹匣的结算按每组 30 发拆分，刷新不会丢失已装子弹", () => {
    const { s, r } = start();
    s.equipment.primary = makeItem("w1");
    s.pack = [makeItem("m1", 30), makeItem("m1", 30)];
    r.magazines[s.equipment.primary.uid] = 0;
    r.finishReload();
    expect(r.mag).toBe(40);
    r.finish(true, "test");
    expect(() => validateSave(s)).not.toThrow();
    const s2 = newSave();
    s2.mode = "easy";
    new Raid(
      s2,
      0,
      sound,
      () => {},
      () => {},
      () => {},
      44,
    );
    const before =
      s2.pack.filter((i) => i.id === "m1").reduce((n, i) => n + i.qty, 0) +
      s2.loadedRounds!.reduce((n, i) => n + i.count, 0);
    recoverInterrupted(s2);
    const total = s2.stash
      .filter((i) => i.id === "m1")
      .reduce((n, i) => n + i.qty, 0);
    expect(total).toBe(before + 60);
  });
  it("保险箱答错锁定和警报，答对进入逐件搜索；移动中断当前搜索", () => {
    const { r } = start(),
      c = r.containers.find((c) => c.locked)!;
    r.p.x = c.x;
    r.p.y = c.y;
    r.interact();
    expect(r.puzzle).toBeDefined();
    r.answer((r.puzzle!.answer + 1) % 11);
    expect(c.cooldown).toBe(3);
    advance(r, 3.2);
    r.interact();
    r.answer(r.puzzle!.answer);
    expect(c.locked).toBe(false);
    expect(r.search).toBe(c);
    advance(r, 0.1, new Set(["KeyD"]));
    expect(r.search).toBeUndefined();
  });
});
