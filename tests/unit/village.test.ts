import { describe, it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { db } from "../../src/data";
import {
  villageWaterBlocked,
  villageBridges,
  villageRoads,
  villageTravelClear,
  inside,
} from "../../src/village";
import type { Sound } from "../../src/audio";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
const sound = { mode: "raid", play: () => {} } as unknown as Sound;
const start = (seed = 85, map = 0) => {
  const s = newSave();
  s.temporary = true;
  s.defeated = ["iron", "swift", "yeed", "maine", "frost"];
  return new Raid(
    s,
    map,
    sound,
    () => {},
    () => {},
    () => {},
    seed,
  );
};
function flood(r: Raid) {
  const first = {
    x: Math.floor(r.p.x / 40) * 40 + 20,
    y: Math.floor(r.p.y / 40) * 40 + 20,
  };
  const q = [first],
    seen = new Set([`${first.x},${first.y}`]);
  for (let i = 0; i < q.length; i++)
    for (const [dx, dy] of [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ]) {
      const p = { x: q[i].x + dx, y: q[i].y + dy },
        key = `${p.x},${p.y}`;
      if (seen.has(key) || r.blocked(p.x, p.y, 19)) continue;
      seen.add(key);
      q.push(p);
    }
  return q;
}
describe("猫尾乡野布局与风险梯度", () => {
  it("河流实际阻隔，三座桥可通行，两条出生路线都连接中央", () => {
    const r = start();
    expect(r.p).toMatchObject({ x: 260, y: 1530 });
    expect(villageWaterBlocked(1200, 1310)).toBe(true);
    for (const b of villageBridges)
      expect(r.blocked(b.x, b.y, 19), b.id).toBe(false);
    const q = flood(r);
    for (const [x, y] of [
      [260, 700],
      [800, 820],
      [1460, 1550],
      [1460, 1180],
      [1580, 940],
      [2140, 500],
    ])
      expect(
        q.some((p) => Math.hypot(p.x - x, p.y - y) < 45),
        `${x},${y}`,
      ).toBe(true);
    // A straight northward attempt from the spawn bank cannot walk through the water.
    const actor = { x: 900, y: 1500 };
    for (let i = 0; i < 250; i++) r.moveActor(actor, 0, -2);
    expect(actor.y).toBeGreaterThan(1270);
  });
  it("可见道路中心线不会通入实墙、水域或围栏", () => {
    const r = start(),
      failures: string[] = [];
    for (const points of villageRoads)
      for (let i = 1; i < points.length; i++) {
        const [ax, ay] = points[i - 1],
          [bx, by] = points[i];
        if (!villageTravelClear(r, ax, ay, bx, by)) {
          const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 15);
          for (let k = 1; k <= n; k++) {
            const x = ax + ((bx - ax) * k) / n,
              y = ay + ((by - ay) * k) / n;
            if (r.blocked(x, y, 19)) {
              failures.push(
                `${ax},${ay} -> ${bx},${by}: blocked ${Math.round(x)},${Math.round(y)} ${r.walls.filter((w) => Math.abs(x - w.x) < w.w / 2 + 19 && Math.abs(y - w.y) < w.h / 2 + 19).map((w) => w.type + ":" + w.x + "," + w.y)}`,
              );
              break;
            }
          }
        }
      }
    expect(failures).toEqual([]);
  });
  it("多个种子下所有容器可接近、敌人不刷进水或墙内，出生没有固定敌人", () => {
    for (let seed = 0; seed < 24; seed++) {
      const r = start(seed),
        q = flood(r);
      for (const c of r.containers)
        expect(
          q.some(
            (p) =>
              Math.hypot(p.x - c.x, p.y - c.y) < 70 &&
              r.lineClear(p.x, p.y, c.x, c.y),
          ),
          `${seed}:${c.region}:${c.type} ${c.x},${c.y}`,
        ).toBe(true);
      expect(r.enemies.length).toBeGreaterThanOrEqual(20);
      expect(r.enemies.length).toBeLessThanOrEqual(22);
      expect(r.enemies.filter((e) => e.boss).map((e) => e.boss!.id)).toEqual([
        "iron",
      ]);
      for (const e of r.enemies) {
        expect(r.blocked(e.x, e.y)).toBe(false);
        expect(Math.hypot(e.x - r.p.x, e.y - r.p.y)).toBeGreaterThan(550);
      }
    }
  });
  it("诊所无枪弹护具，低价值野外多于高价值容器，传说只在谷仓与农庄极少出现", () => {
    const totals: Record<
      string,
      { value: number; count: number; legend: number }
    > = {};
    for (let seed = 0; seed < 200; seed++) {
      const r = start(seed);
      const low = r.containers.filter((c) =>
        ["box", "litter"].includes(c.type),
      );
      const high = r.containers.filter((c) =>
        ["safe", "weapon", "bed"].includes(c.type),
      );
      expect(low.length).toBeGreaterThan(high.length);
      for (const c of r.containers) {
        if (c.region === "spawn") expect(["box", "litter"]).toContain(c.type);
        if (c.region === "clinic")
          expect(
            c.items.every((i) =>
              ["food", "collectible"].includes(db[i.id].kind),
            ),
          ).toBe(true);
        if (["safe", "weapon", "bed"].includes(c.type))
          expect(["hunter", "shop", "clinic", "barn", "boss"]).toContain(
            c.region,
          );
        const t = (totals[c.region!] ||= { value: 0, count: 0, legend: 0 });
        for (const i of c.items)
          if (db[i.id].kind === "collectible") {
            t.count++;
            t.value += db[i.id].price;
            if (db[i.id].tier === 5) t.legend++;
          }
      }
    }
    expect(totals.boss.value / totals.boss.count).toBeGreaterThan(
      totals.barn.value / totals.barn.count,
    );
    expect(totals.barn.value / totals.barn.count).toBeGreaterThan(
      totals.clinic.value / totals.clinic.count,
    );
    expect(totals.clinic.value / totals.clinic.count).toBeGreaterThan(
      totals.hunter.value / totals.hunter.count,
    );
    for (const [region, t] of Object.entries(totals))
      if (!["boss", "barn"].includes(region)) expect(t.legend).toBe(0);
    expect(totals.boss.legend / totals.boss.count).toBeLessThan(0.005);
  });
  it("AI寻路经过桥面，不会直冲河流，谷仓侧门与农庄内撤离点均可到达", () => {
    const r = start(),
      e = r.enemies[0];
    e.x = 260;
    e.y = 1530;
    r.route(e, 260, 600);
    expect(e.path!.length).toBeGreaterThan(5);
    expect(e.path!.every((p) => !r.blocked(p.x, p.y, 19))).toBe(true);
    expect(e.path!.some((p) => inside(p.x, p.y, villageBridges[0]))).toBe(true);
    e.x = 800;
    e.y = 820;
    r.route(e, 2060, 1180);
    expect(e.path!.some((p) => p.x > 1900 && Math.abs(p.y - 1180) < 60)).toBe(
      true,
    );
    // Exercise the actual enemy update, not only the generated path: the AI
    // must cross the main bridge rather than see the player and push into water.
    Object.assign(r.p, { x: 260, y: 300 });
    Object.assign(e, {
      x: 1460,
      y: 1560,
      state: "investigate",
      target: { x: 1460, y: 1250 },
      alert: 1000,
      path: [],
      pathTime: 0,
    });
    let crossedDeck = false;
    for (let n = 0; n < 600 && Math.hypot(e.x - 1460, e.y - 1250) > 30; n++) {
      r.updateEnemy(e, 1 / 30);
      crossedDeck ||= inside(e.x, e.y, villageBridges[2]);
      expect(villageWaterBlocked(e.x, e.y, 15)).toBe(false);
    }
    expect(crossedDeck).toBe(true);
    expect(Math.hypot(e.x - 1460, e.y - 1250)).toBeLessThan(30);
    const exit = r.exits[1];
    expect(inside(exit.x, exit.y, { x: 1955, y: 395, w: 590, h: 530 })).toBe(
      true,
    );
    expect(r.exits[0]).toMatchObject({ active: true, paid: false });
    expect(r.exits[2]).toMatchObject({ active: true, paid: true });
  });
  it("Boss护卫分组警戒，Boss不追出农庄；其他地图仍使用原布局", () => {
    const r = start(),
      west = r.enemies.find((e) => e.squad === "boss-west")!;
    r.engage(west);
    expect(
      r.enemies
        .filter((e) => e.squad === "boss-inner")
        .every((e) => e.state === "patrol"),
    ).toBe(true);
    const boss = r.enemies.find((e) => e.boss)!;
    boss.target = { x: 260, y: 1530 };
    boss.state = "combat";
    boss.alert = 1000;
    boss.cool = 1000;
    boss.skillCool = 1000;
    for (let n = 0; n < 600; n++) r.updateEnemy(boss, 1 / 30);
    expect(inside(boss.x, boss.y, boss.leash!, -20)).toBe(true);
    for (let m = 1; m < 4; m++) {
      const other = start(85, m);
      expect(other.rooms).toHaveLength(4);
      expect(other.containers).toHaveLength(20);
      expect(other.exits[0]).toMatchObject({ x: 170, y: 1000 });
      expect(other.p).toMatchObject({ x: 260, y: 1450 });
      expect(other.walls.some((w) => w.type?.startsWith("village"))).toBe(
        false,
      );
    }
  });
});
