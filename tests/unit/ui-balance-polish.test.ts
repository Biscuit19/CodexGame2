import { it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { db } from "../../src/data";
Object.assign(globalThis, {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
});
function start(seed = 0, map = 0) {
  const s = newSave();
  s.temporary = true;
  return new Raid(
    s,
    map,
    { play: () => {} } as any,
    () => {},
    () => {},
    () => {},
    seed,
  );
}
it("普通敌弹整体降低30%，Boss与玩家子弹不变，特殊高速普通弹也降低", () => {
  const r = start();
  r.bullets = [];
  for (const [friendly, boss, speed] of [
    [true, false, 1050],
    [false, false, 950],
    [false, false, 1100],
    [false, true, 1100],
  ] as const)
    r.addBullet(
      3000,
      3000,
      0,
      friendly,
      10,
      1,
      800,
      false,
      false,
      undefined,
      boss,
      speed,
    );
  expect(r.bullets.map((b) => Math.round(Math.hypot(b.vx, b.vy)))).toEqual([
    1050, 665, 770, 1100,
  ]);
});
it("多个种子高价值容器保底蓝，普通区域可见蓝物品，Boss出货等级更高，安全容器只出收集品", () => {
  let ordinary = 0,
    blue = 0,
    wild = 0,
    wildN = 0,
    boss = 0,
    bossN = 0;
  for (let seed = 0; seed < 40; seed++)
    for (const map of [0, 1]) {
      const r = start(seed, map);
      for (const c of r.containers) {
        if (["safe", "bed", "weapon"].includes(c.type) && c.items.length)
          expect(
            c.items.some((i) => db[i.id].tier >= 3),
            `${map}:${seed}:${c.type}`,
          ).toBe(true);
        if (["safe", "bed"].includes(c.type))
          expect(c.items.every((i) => db[i.id].kind === "collectible")).toBe(
            true,
          );
        if (map !== 0) continue;
        for (const i of c.items) {
          const d = db[i.id];
          if (
            [
              "box",
              "basket",
              "toolbox",
              "cooler",
              "trashcan",
              "litter",
            ].includes(c.type) &&
            !c.region?.startsWith("boss")
          ) {
            ordinary++;
            if (d.tier >= 3) blue++;
          }
          if (c.region === "wild") {
            wild += d.tier;
            wildN++;
          }
          if (c.region === "boss") {
            boss += d.tier;
            bossN++;
          }
        }
      }
    }
  expect(blue / ordinary).toBeGreaterThan(0.12);
  expect(boss / bossN).toBeGreaterThan(wild / wildN + 0.7);
});
