import { describe, it, expect } from "vitest";
import {
  newSave,
  deploymentWarnings,
  beginRaid,
  unequipToStash,
  sellSelectedStash,
  shopUnlockHint,
  packCapacity,
} from "../../src/store";
import { db, makeItem, sale } from "../../src/data";
import { Raid, type Container } from "../../src/raid";
import { villageBuildings, villageProps } from "../../src/village";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function base() {
  const s = newSave();
  s.temporary = true;
  return s;
}
function raid() {
  const s = base();
  const r = new Raid(
    s,
    0,
    { play: () => {} } as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  return { r, s };
}
describe("整备快捷操作与新搜索点", () => {
  it("出战检查按已装备枪械、总携弹与可自动装备食物给出明确缺项，完全无装备仍允许出战", () => {
    const s = base();
    expect(deploymentWarnings(s)).toEqual([]);
    s.pack = [];
    s.equipment.primary = null;
    s.equipment.secondary = null;
    s.equipment.ammo = null;
    s.equipment.food = null;
    s.equipment.melee = null;
    expect(deploymentWarnings(s)).toHaveLength(3);
    expect(beginRaid(s)).toBe(true);
    expect(s.pending).toBe(true);
    s.equipment.secondary = makeItem("w3");
    s.equipment.secondary.loaded = { tier: 1, count: 30 };
    s.equipment.ammo = makeItem("m1", 89);
    s.pack = [makeItem("f2")];
    expect(deploymentWarnings(s)).toEqual([
      "携带子弹不足120发（当前119发，还缺1发）",
    ]);
    s.pack.push(makeItem("m2", 1));
    expect(deploymentWarnings(s)).toEqual([]);
  });
  it("商店锁定物品提示对应首领，解锁后不再提示", () => {
    const s = base();
    s.temporary = false;
    s.defeated = [];
    for (const [level, id, name] of [
      [1, "iron", "铁腮"],
      [2, "swift", "闪尾"],
      [3, "yeed", "猫伊德"],
    ] as const) {
      const item = Object.values(db).find((d) => d.unlock === level)!;
      expect(shopUnlockHint(s, item.id)).toContain("击败");
      expect(shopUnlockHint(s, item.id)).toContain(name);
      s.defeated.push(id);
      expect(shopUnlockHint(s, item.id)).toBe("");
    }
  });
  it("装备卸回仓库保持UID、弹匣与耐久，仓库满或背包缩容失败不改变物品", () => {
    const s = base(),
      gun = s.equipment.primary!;
    gun.loaded = { tier: 2, count: 17 };
    gun.durability = 62;
    expect(unequipToStash(s, gun.uid)).toBe(true);
    expect(s.equipment.primary).toBeNull();
    expect(s.stash.find((i) => i.uid === gun.uid)).toMatchObject({
      loaded: { tier: 2, count: 17 },
      durability: 62,
    });
    const helmet = s.equipment.helmet!;
    s.stash = Array.from({ length: 60 }, () => makeItem("c1_0"));
    expect(unequipToStash(s, helmet.uid)).toBe(false);
    expect(s.equipment.helmet).toBe(helmet);
    s.stash = [];
    s.equipment.bag = makeItem("b5");
    s.pack = Array.from({ length: 21 }, () => makeItem("c1_0"));
    expect(unequipToStash(s, s.equipment.bag.uid)).toBe(false);
  });
  it("勾选出售只出售指定仓库UID，重复编号与过期编号不会多算金币", () => {
    const s = base();
    s.stash = [makeItem("w4"), makeItem("c4_0"), makeItem("f2", 3)];
    const [a, b, c] = s.stash,
      coins = s.coins;
    const price = sale(a) + sale(c);
    expect(sellSelectedStash(s, [a.uid, a.uid, c.uid, "stale"])).toBe(price);
    expect(s.coins).toBe(coins + price);
    expect(s.stash).toEqual([b]);
  });
  it("满背包快捷拾取枪械优先空主枪再空副枪，枪械与弹匣只转移一次", () => {
    const { r, s } = raid();
    s.equipment.primary = null;
    s.equipment.secondary = null;
    s.pack = Array.from({ length: packCapacity(s) }, () => makeItem("c1_0"));
    const items = [makeItem("w3"), makeItem("w7"), makeItem("w9")];
    items[0].loaded = { tier: 2, count: 21 };
    const c: Container = {
      x: r.p.x,
      y: r.p.y,
      name: "武器箱",
      type: "weapon",
      items: [...items],
      revealed: 3,
      open: true,
      locked: false,
      cooldown: 0,
    };
    r.search = c;
    r.take(0, false, true);
    expect(s.equipment.primary?.uid).toBe(items[0].uid);
    expect(s.equipment.primary?.loaded?.count).toBe(21);
    r.take(0, false, true);
    expect(s.equipment.secondary?.uid).toBe(items[1].uid);
    expect(s.pack).toHaveLength(packCapacity(s));
    r.take(0, false, true);
    expect(c.items.map((i) => i.uid)).toEqual([items[2].uid]);
    expect(c.revealed).toBe(1);
  });
  it("装填的副枪单独存在时默认激活副枪，完全无装备的出击也正常创建", () => {
    const s = base();
    s.equipment.primary = null;
    s.equipment.secondary = makeItem("w3");
    let r = new Raid(
      s,
      0,
      { play: () => {} } as any,
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(r.activeWeapon).toBe("secondary");
    const empty = base();
    empty.pack = [];
    for (const k of Object.keys(empty.equipment)) empty.equipment[k] = null;
    r = new Raid(
      empty,
      0,
      { play: () => {} } as any,
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(r.weapon).toBeUndefined();
    expect(r.done).toBe(false);
  });
  it("原蓝白箱与垃圾桶装饰逐一变成可搜索容器，保温箱第一件为恢复食物", () => {
    const { r } = raid();
    const props = villageProps.filter((p) =>
      ["cooler", "trashcan"].includes(p.model),
    );
    for (const type of ["cooler", "trashcan"])
      expect(r.containers.filter((c) => c.type === type)).toHaveLength(
        props.filter((p) => p.model === type).length,
      );
    expect(
      r.containers
        .filter((c) => c.type === "cooler")
        .every((c) => db[c.items[0].id].kind === "food"),
    ).toBe(true);
    expect(
      r.containers
        .filter((c) => c.type === "basket")
        .every((c) => c.name === "鸟窝"),
    ).toBe(true);
  });
  it("全部露天工棚均替换成有屋顶的两种破棚屋，保留原占地和宽入口", () => {
    expect(villageBuildings.some((b) => b.model === "open-workshop")).toBe(
      false,
    );
    const sheds = villageBuildings.filter((b) =>
      b.model.startsWith("weathered-shed"),
    );
    expect(sheds).toHaveLength(4);
    expect(new Set(sheds.map((b) => b.model)).size).toBe(2);
    for (const b of sheds) {
      expect([b.w, b.h, b.doorWidth]).toEqual([300, 200, 180]);
      expect(b.openStructure).toBe("ruin");
    }
  });
});
