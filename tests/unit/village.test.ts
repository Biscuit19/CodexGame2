import { createHash } from "node:crypto";
import baselineContent from "../fixtures/village-content.json";
import { describe, it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { db } from "../../src/data";
import {
  villageWaterBlocked,
  villageBridges,
  villageRoads,
  villageTravelClear,
  villagePoint,
  villageScale,
  villagePaths,
  villageX,
  hitsRect,
  villageProps,
  villageDecorations,
  villageTrees,
  villageRocks,
  villageBuildings,
  buildingWorld,
  inBuilding,
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
let floodCache: { key: string; points: { x: number; y: number }[] } | undefined;
function flood(r: Raid) {
  const key = JSON.stringify([r.width, r.height, r.walls, r.p.x, r.p.y]);
  if (floodCache?.key === key) return floodCache.points;
  const first = {
      x: Math.floor(r.p.x / 16) * 16 + 8,
      y: Math.floor(r.p.y / 16) * 16 + 8,
    },
    q = [first],
    seen = new Set([`${first.x},${first.y}`]);
  for (let n = 0; n < q.length; n++)
    for (const [dx, dy] of [
      [16, 0],
      [-16, 0],
      [0, 16],
      [0, -16],
    ]) {
      const p = { x: q[n].x + dx, y: q[n].y + dy },
        key = `${p.x},${p.y}`;
      if (seen.has(key) || r.blocked(p.x, p.y, 19)) continue;
      seen.add(key);
      q.push(p);
    }
  floodCache = { key, points: q };
  return q;
}
describe("大尺度猫尾乡野布局与风险梯度", () => {
  it("7500×6000地图拉开区域，两条出生路线经三桥实际连通，河流不可涉水", () => {
    const r = start();
    expect([r.width, r.height]).toEqual([7500, 6000]);
    expect(r.p).toMatchObject(villagePoint(260, 1530));
    const water = villagePoint(1200, 1310);
    expect(villageWaterBlocked(water.x, water.y)).toBe(true);
    const q = flood(r);
    for (const b of villageBridges)
      expect(r.blocked(b.x, b.y, 19), b.id).toBe(false);
    for (const b of villageBuildings)
      expect(
        q.some((p) => inBuilding(b, p.x, p.y)),
        b.id,
      ).toBe(true);
    for (const e of r.exits)
      expect(
        q.some((p) => Math.hypot(p.x - e.x, p.y - e.y) < 90),
        e.name,
      ).toBe(true);
    for (let i = 0; i < 6; i++)
      for (let j = i + 1; j < 6; j++)
        expect(
          Math.hypot(
            villageBuildings[i].x - villageBuildings[j].x,
            villageBuildings[i].y - villageBuildings[j].y,
          ),
        ).toBeGreaterThan(1100);
    const actor = villagePoint(900, 1500);
    for (let n = 0; n < 1000; n++) r.moveActor(actor, 0, -3);
    expect(actor.y).toBeGreaterThan(villagePoint(900, 1250).y);
  });
  it("可见道路中心线不穿实墙、水域、围栏，旋转建筑的入口确实可走入", () => {
    const r = start(),
      errors: string[] = [];
    for (const points of [...villageRoads, ...villagePaths])
      for (let n = 1; n < points.length; n++)
        if (
          !villageTravelClear(
            r,
            ...(points[n - 1] as [number, number]),
            ...(points[n] as [number, number]),
          )
        ) {
          const [a, b] = [points[n - 1], points[n]],
            steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10);
          for (let i = 0; i <= steps; i++) {
            const x = a[0] + ((b[0] - a[0]) * i) / steps,
              y = a[1] + ((b[1] - a[1]) * i) / steps;
            if (r.blocked(x, y, 19)) {
              errors.push(
                `${a} -> ${b}: ${x},${y} ${JSON.stringify(r.walls.filter((w) => hitsRect(x, y, w, 19)))} water:${villageWaterBlocked(x, y, 19)}`,
              );
              break;
            }
          }
        }
    expect(errors).toEqual([]);
    expect(
      new Set(villageBuildings.map((b) => b.rotation)).size,
    ).toBeGreaterThanOrEqual(4);
    for (const b of villageBuildings) {
      const p = buildingWorld(b, b.doorOffset, b.doorY + 60),
        goal = buildingWorld(b, b.doorOffset, 0);
      expect(villageTravelClear(r, p.x, p.y, goal.x, goal.y), b.id).toBe(true);
      expect(b.h).toBeLessThanOrEqual(250);
      expect(b.w).toBeLessThanOrEqual(380);
      expect(b.doorWidth).toBeGreaterThanOrEqual(50);
    }
  });
  it("多个种子下容器全部可接近、室内间距足够，敌人不刷进水或墙内，出生无固定敌人", () => {
    for (let seed = 0; seed < 16; seed++) {
      const r = start(seed),
        q = flood(r);
      for (const c of r.containers)
        expect(
          q.some(
            (p) =>
              Math.hypot(p.x - c.x, p.y - c.y) < 85 &&
              r.lineClear(p.x, p.y, c.x, c.y),
          ),
          `${seed}:${c.region} ${c.x},${c.y}`,
        ).toBe(true);
      for (const b of villageBuildings) {
        const contents = r.containers.filter((c) => inBuilding(b, c.x, c.y));
        expect(contents.length, b.id).toBeLessThanOrEqual(
          Math.floor((b.w * b.h) / 9000),
        );
        for (let i = 0; i < contents.length; i++)
          for (let j = i + 1; j < contents.length; j++)
            expect(
              Math.hypot(
                contents[i].x - contents[j].x,
                contents[i].y - contents[j].y,
              ),
              `${b.id}:${i},${j}`,
            ).toBeGreaterThanOrEqual(75);
      }
      expect(r.enemies.length).toBeGreaterThanOrEqual(20);
      expect(r.enemies.length).toBeLessThanOrEqual(22);
      expect(r.enemies.filter((e) => e.boss).map((e) => e.boss!.id)).toEqual([
        "iron",
      ]);
      for (const e of r.enemies) {
        expect(r.blocked(e.x, e.y)).toBe(false);
        expect(Math.hypot(e.x - r.p.x, e.y - r.p.y)).toBeGreaterThan(2000);
      }
    }
  });
  it("原有区域容器数量、概率与资源梯度不变，诊所无枪弹护具，传说仍极稀有", () => {
    const totals: Record<
      string,
      { value: number; count: number; legend: number }
    > = {};
    for (let seed = 0; seed < 200; seed++) {
      const r = start(seed);
      expect(r.containers.length).toBeGreaterThanOrEqual(46);
      expect(r.containers.length).toBeLessThanOrEqual(55);
      expect(
        r.containers.filter((c) => ["box", "litter"].includes(c.type)).length,
      ).toBeGreaterThan(
        r.containers.filter((c) => ["safe", "weapon", "bed"].includes(c.type))
          .length,
      );
      const region = (name: string) =>
        r.containers.filter((c) => c.region === name);
      expect(region("spawn")).toHaveLength(2);
      expect(region("hunter").length).toBeGreaterThanOrEqual(5);
      expect(region("hunter").length).toBeLessThanOrEqual(6);
      expect(region("clinic").filter((c) => c.type === "medical")).toHaveLength(
        3,
      );
      for (const c of r.containers) {
        if (c.region === "clinic")
          expect(
            c.items.every((i) =>
              ["food", "collectible"].includes(db[i.id].kind),
            ),
          ).toBe(true);
        const t = (totals[c.region!] ||= { value: 0, count: 0, legend: 0 });
        for (const i of c.items)
          if (db[i.id].kind === "collectible") {
            t.value += db[i.id].price;
            t.count++;
            if (db[i.id].tier === 5) t.legend++;
          }
      }
    }
    for (const [a, b] of [
      ["boss", "barn"],
      ["barn", "clinic"],
      ["clinic", "hunter"],
    ])
      expect(totals[a].value / totals[a].count).toBeGreaterThan(
        totals[b].value / totals[b].count,
      );
    for (const [region, t] of Object.entries(totals))
      if (!["boss", "barn"].includes(region)) expect(t.legend).toBe(0);
    expect(totals.boss.legend / totals.boss.count).toBeLessThan(0.005);
  });
  it("大地图A*可跨河经桥和旋转门寻路，实际AI能过主桥；B点在农庄内无击杀限制", () => {
    const r = start(),
      e = r.enemies[0];
    Object.assign(e, villagePoint(260, 1530));
    const hut = villageBuildings[0];
    r.route(e, hut.x, hut.y);
    expect(e.path!.length).toBeGreaterThan(10);
    expect(e.path!.every((p) => !r.blocked(p.x, p.y, 19))).toBe(true);
    expect(e.path!.some((p) => inside(p.x, p.y, villageBridges[0]))).toBe(true);
    const bridge = villageBridges[2],
      target = { x: bridge.x, y: bridge.y - bridge.h / 2 - 40 };
    Object.assign(r.p, villagePoint(260, 300));
    Object.assign(e, {
      x: bridge.x,
      y: bridge.y + bridge.h / 2 + 40,
      state: "investigate",
      target,
      alert: 1000,
      path: [],
      pathTime: 0,
    });
    let crossed = false;
    for (
      let n = 0;
      n < 2400 && Math.hypot(e.x - target.x, e.y - target.y) > 45;
      n++
    ) {
      r.updateEnemy(e, 1 / 30);
      crossed ||= inside(e.x, e.y, bridge);
      expect(villageWaterBlocked(e.x, e.y, 15)).toBe(false);
    }
    expect(crossed).toBe(true);
    expect(Math.hypot(e.x - target.x, e.y - target.y)).toBeLessThan(45);
    expect(
      inside(r.exits[1].x, r.exits[1].y, {
        ...villagePoint(1955, 395),
        w: 590 * villageScale.x,
        h: 530 * villageScale.y,
      }),
    ).toBe(true);
    expect(r.exits[0]).toMatchObject({ active: true, paid: false });
    expect(r.exits[2]).toMatchObject({ active: true, paid: true });
  });
  it("相同种子的容器内容、敌猫装备与撤离开放状态和扩图前逐项一致", () => {
    for (const [seed, hash] of Object.entries(baselineContent)) {
      const r = start(Number(seed)),
        data = {
          containers: r.containers
            .filter((c) => c.region !== "shelter")
            .map((c) => ({
              region: c.region,
              type: c.type,
              items: c.items.map((i) => [i.id, i.qty]),
            })),
          enemies: r.enemies.map((e) => [
            e.breed,
            e.tier,
            e.weapon,
            e.maxHp,
            e.boss?.id || "",
          ]),
          exits: r.exits.map((e) => [e.paid, e.active]),
        };
      expect(
        createHash("sha256").update(JSON.stringify(data)).digest("hex"),
        seed,
      ).toBe(hash);
    }
  });
  it("乡村装饰保持稀疏、来源样式齐全且不进入水域和房屋入口", () => {
    expect(villageTrees.length).toBeGreaterThan(45);
    expect(villageTrees.length).toBeLessThan(130);
    expect(villageRocks.length).toBeGreaterThan(20);
    expect(villageRocks.length).toBeLessThan(80);
    expect(villageDecorations.length).toBeGreaterThan(100);
    expect(villageDecorations.length).toBeLessThan(350);
    expect(new Set(villageDecorations.map((d) => d.kind))).toEqual(
      new Set(["grass", "flower", "flower-white", "bush", "hay"]),
    );
    for (const d of villageDecorations) {
      expect(d.x).toBeGreaterThan(0);
      expect(d.x).toBeLessThan(7500);
      expect(d.y).toBeGreaterThan(0);
      expect(d.y).toBeLessThan(6000);
      expect(villageWaterBlocked(d.x, d.y, 15), JSON.stringify(d)).toBe(false);
      expect(villageBuildings.some((b) => inBuilding(b, d.x, d.y, 35))).toBe(
        false,
      );
    }
  });
  it("仅压缩西侧宽度，猎人双屋均摊原物资，新增小屋各一个低级箱子与家具", () => {
    expect(villagePoint(1300, 580)).toEqual({
      x: 1300 * 3.75 - 1500,
      y: 580 * (6000 / 1800),
    });
    expect(villagePoint(2060, 1180)).toEqual({
      x: 2060 * 3.75 - 1500,
      y: 1180 * (6000 / 1800),
    });
    expect(villagePoint(260, 600).x).toBe(975);
    expect(villageX(9000)).toBe(7500);
    const r = start(),
      main = villageBuildings[0],
      side = villageBuildings.find((b) => b.id === "hunter-side")!;
    expect((main.w * main.h) / (220 * 132)).toBeCloseTo(1.5, 1);
    expect(side.x).toBeLessThan(main.x - 400);
    for (const b of [main, side])
      expect(
        r.containers.filter(
          (c) => c.region === "hunter" && inBuilding(b, c.x, c.y),
        ).length,
      ).toBeGreaterThanOrEqual(2);
    const shelters = villageBuildings.filter((b) => b.minor);
    expect(shelters).toHaveLength(2);
    for (const b of shelters) {
      expect(b.name).toBe("");
      expect(r.containers.filter((c) => inBuilding(b, c.x, c.y))).toHaveLength(
        1,
      );
    }
    expect(r.containers.filter((c) => c.region === "shelter")).toHaveLength(2);
    for (const c of r.containers.filter((c) => c.region === "shelter"))
      expect(c.items.every((i) => db[i.id].tier === 1)).toBe(true);
    expect(
      new Set(villageProps.map((p) => p.model)).size,
    ).toBeGreaterThanOrEqual(12);
    expect(villageProps.some((p) => p.model === "bed" && p.buildingId)).toBe(
      true,
    );
    expect(villageProps.some((p) => p.model === "desk" && p.buildingId)).toBe(
      true,
    );
    expect(villageBuildings.find((b) => b.id === "barn")!.flatRoof).toBe(true);
  });
  it("Boss护卫保持分组警戒和追击范围，其他地图保留原尺寸与布局", () => {
    const r = start(),
      west = r.enemies.find((e) => e.squad === "boss-west")!;
    r.engage(west);
    expect(
      r.enemies
        .filter((e) => e.squad === "boss-inner")
        .every((e) => e.state === "patrol"),
    ).toBe(true);
    const boss = r.enemies.find((e) => e.boss)!;
    boss.target = villagePoint(260, 1530);
    boss.state = "combat";
    boss.alert = 1000;
    boss.cool = boss.skillCool = 1000;
    for (let n = 0; n < 600; n++) r.updateEnemy(boss, 1 / 30);
    expect(inside(boss.x, boss.y, boss.leash!, -20)).toBe(true);
    for (let m = 1; m < 4; m++) {
      const other = start(85, m);
      expect([other.width, other.height]).toEqual([2400, 1800]);
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
