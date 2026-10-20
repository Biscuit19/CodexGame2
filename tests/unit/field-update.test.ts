import { describe, it, expect, vi } from "vitest";
import {
  newSave,
  sortPack,
  packGrid,
  sellCommonCollectibles,
  validateSave,
} from "../../src/store";
import { makeItem, db, sale } from "../../src/data";
import { Raid } from "../../src/raid";
import {
  villageBuildings,
  villageDecorations,
  villagePoint,
  hitsRect,
} from "../../src/village";
import { CONTAINER_HIGHLIGHT_RANGE } from "../../src/container-info";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function start(map = 0, seed = 42) {
  const s = newSave();
  s.temporary = true;
  s.coins = 999999;
  const sound = { play: vi.fn() };
  const notice = vi.fn();
  const r = new Raid(
    s,
    map,
    sound as any,
    () => {},
    () => {},
    notice,
    seed,
  );
  r.enemies = [];
  return { r, s, sound, notice };
}
describe("乡野交互与整备改进", () => {
  it("所有地图撤离点每局全部开放，付费点仍需E付费后才开始倒计时", () => {
    for (let map = 0; map < 4; map++)
      for (let seed = 0; seed < 8; seed++) {
        const { r, s } = start(map, seed);
        expect(r.exits.every((e) => e.active)).toBe(true);
        const e = r.exits.find((e) => e.paid)!;
        r.containers = [];
        Object.assign(r.p, { x: e.x, y: e.y });
        r.update(0.05, new Set(), { x: e.x + 50, y: e.y, down: false });
        expect(r.extract).toBe(0);
        const coins = s.coins;
        r.interact();
        expect(e.bought).toBe(true);
        expect(s.coins).toBeLessThan(coins);
        r.update(0.05, new Set(), { x: e.x + 50, y: e.y, down: false });
        expect(r.extract).toBeGreaterThan(0);
      }
  });
  it("农庄新增两处小建筑和恰好八个容器，2高3中3低，普通纸箱已有替代外形", () => {
    const { r } = start();
    const cs = r.containers.filter((c) => c.region === "boss-yard");
    expect(cs).toHaveLength(8);
    expect(
      cs.filter((c) => ["weapon", "safe", "bed"].includes(c.type)),
    ).toHaveLength(2);
    expect(
      cs.filter((c) => ["cabinet", "medical"].includes(c.type)),
    ).toHaveLength(3);
    expect(
      cs.filter((c) => ["box", "basket", "toolbox"].includes(c.type)),
    ).toHaveLength(3);
    expect(
      villageBuildings.filter((b) => b.id.startsWith("boss-annex")),
    ).toHaveLength(2);
    for (const type of ["box", "basket", "toolbox"])
      expect(r.containers.some((c) => c.type === type)).toBe(true);
    expect(CONTAINER_HIGHLIGHT_RANGE).toBe(168);
  });
  it("草垛与木材中心有实体，花草及野餐布不额外添加核心碰撞", () => {
    const { r } = start();
    for (const d of villageDecorations.filter((d) => d.kind === "hay"))
      expect(r.blocked(d.x, d.y)).toBe(true);
    const logs = villagePoint(155, 685);
    expect(r.blocked(logs.x, logs.y)).toBe(true);
    const flower = villageDecorations.find(
      (d) => d.kind === "flower" && !r.blocked(d.x, d.y),
    )!;
    expect(flower).toBeTruthy();
    expect(
      r.walls.some(
        (w) =>
          w.type === "village-prop-core" && hitsRect(flower.x, flower.y, w, 0),
      ),
    ).toBe(false);
  });
  it("整理按类型再按实际价值排序，不改变堆叠、数量或物品编号", () => {
    const { s } = start();
    s.pack = ["c1_0", "f1", "w2", "m2", "w3", "f3"].map((id) => makeItem(id));
    const before = s.pack.map((i) => [i.uid, i.id, i.qty]);
    s.packLayout = ["", s.pack[0].uid];
    sortPack(s);
    const kinds = [
      "weapon",
      "armor",
      "helmet",
      "bag",
      "ammo",
      "food",
      "melee",
      "collectible",
    ];
    for (let n = 1; n < s.pack.length; n++) {
      const a = s.pack[n - 1],
        b = s.pack[n];
      expect(kinds.indexOf(db[a.id].kind)).toBeLessThanOrEqual(
        kinds.indexOf(db[b.id].kind),
      );
      if (db[a.id].kind === db[b.id].kind)
        expect(sale(a)).toBeGreaterThanOrEqual(sale(b));
    }
    expect(s.pack.map((i) => [i.uid, i.id, i.qty]).sort()).toEqual(
      before.sort(),
    );
    expect(packGrid(s).slice(0, s.pack.length).every(Boolean)).toBe(true);
  });
  it("批量出售只影响仓库珍贵及以下收藏，高级收藏、装备与背包均保留", () => {
    const { s } = start();
    const low = [1, 2, 3].map((t) =>
      makeItem(
        Object.values(db).find((d) => d.kind === "collectible" && d.tier === t)!
          .id,
      ),
    );
    const kept = [4, 5].map((t) =>
      makeItem(
        Object.values(db).find((d) => d.kind === "collectible" && d.tier === t)!
          .id,
      ),
    );
    kept.push(makeItem("f1"), makeItem("w0"));
    s.stash = [...low, ...kept];
    const pack = structuredClone(s.pack),
      coins = s.coins,
      expected = low.reduce((a, i) => a + sale(i), 0);
    expect(sellCommonCollectibles(s)).toBe(expected);
    expect(s.coins).toBe(coins + expected);
    expect(s.stash).toEqual(kept);
    expect(s.pack).toEqual(pack);
  });
  it("五分钟警告保留文字但没有语音或警报，旧存档支持新增准星设置", () => {
    const { r, s, sound, notice } = start();
    r.time = 300.01;
    const speak = vi.fn();
    (globalThis as any).window.speechSynthesis = { speak };
    r.update(0.05, new Set(), { x: r.p.x + 50, y: r.p.y, down: false });
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("5 分钟"));
    expect(speak).not.toHaveBeenCalled();
    expect(sound.play).not.toHaveBeenCalledWith("alert");
    delete s.settings.crosshair;
    expect(validateSave(s).settings.crosshair).toBeUndefined();
    s.settings.crosshair = "cross";
    expect(validateSave(s).settings.crosshair).toBe("cross");
    expect(() =>
      validateSave({ ...s, settings: { ...s.settings, crosshair: "wrong" } }),
    ).toThrow();
  });
});
