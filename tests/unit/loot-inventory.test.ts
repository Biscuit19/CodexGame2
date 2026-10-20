import { describe, it, expect } from "vitest";
import {
  newSave,
  packGrid,
  movePackSlot,
  validateSave,
  put,
  packCapacity,
} from "../../src/store";
import {
  makeItem,
  bosses,
  collectibleColors,
  itemNameColor,
  db,
} from "../../src/data";
import { Raid, type Container } from "../../src/raid";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
const save = () => {
  const s = newSave();
  s.temporary = true;
  s.pack = [makeItem("c1_0"), makeItem("c2_0"), makeItem("c3_0")];
  return s;
};
const raid = () => {
  const s = save();
  const r = new Raid(
    s,
    1,
    { play: () => {} } as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  r.walls = [];
  return { s, r };
};
describe("容器与背包整理", () => {
  it("背包交换位置、移动到空格后重新读取仍保留空位，物品不复制不丢失", () => {
    const s = save(),
      ids = s.pack.map((i) => i.uid);
    expect(movePackSlot(s, ids[0], 1)).toBe(true);
    expect(
      packGrid(s)
        .slice(0, 3)
        .map((i) => i?.uid),
    ).toEqual([ids[1], ids[0], ids[2]]);
    expect(movePackSlot(s, ids[0], 16)).toBe(true);
    const restored = validateSave(JSON.parse(JSON.stringify(s))),
      grid = packGrid(restored);
    expect(grid[1]).toBeUndefined();
    expect(grid[16]?.uid).toBe(ids[0]);
    expect(restored.pack.map((i) => i.uid).sort()).toEqual([...ids].sort());
    expect(grid).toHaveLength(packCapacity(s));
  });
  it("新物品填充已有空位，堆叠与移除不会挤走其他格子", () => {
    const s = save(),
      uid = s.pack[2].uid;
    movePackSlot(s, uid, 12);
    const a = makeItem("m1", 80),
      b = makeItem("m1", 40);
    put(s.pack, a, 20);
    packGrid(s);
    put(s.pack, b, 20);
    expect(packGrid(s)[12]?.uid).toBe(uid);
    expect(s.pack.find((i) => i.id === "m1")?.qty).toBe(120);
    const first = s.pack[0].uid;
    s.pack = s.pack.filter((i) => i.uid !== first);
    const c = makeItem("f1");
    put(s.pack, c, 20);
    expect(packGrid(s)[0]?.uid).toBe(c.uid);
    expect(packGrid(s)[12]?.uid).toBe(uid);
  });
  it("旧存档无需格位记录，非法格位被拒绝且不能移动到容量之外", () => {
    const s = save();
    expect(packGrid(s).filter(Boolean)).toHaveLength(3);
    expect(movePackSlot(s, s.pack[0].uid, 20)).toBe(false);
    expect(movePackSlot(s, "missing", 2)).toBe(false);
    expect(() => validateSave({ ...s, packLayout: [123] })).toThrow();
  });
  it("战斗丢弃直接删除物品，不生成任何新容器", () => {
    const { s, r } = raid(),
      uid = s.pack[0].uid,
      count = r.containers.length;
    expect(r.dropItem(uid)).toBe(true);
    expect(r.dropItem(uid)).toBe(false);
    expect(s.pack.some((i) => i.uid === uid)).toBe(false);
    expect(r.containers).toHaveLength(count);
  });
  it("取空后原容器可再次打开，空容器不消失或重复计搜索次数", () => {
    const { r } = raid();
    r.save.pack = [];
    const c: Container = {
      x: r.p.x + 30,
      y: r.p.y,
      name: "纸箱",
      type: "box",
      items: [makeItem("c1_0")],
      revealed: 1,
      open: false,
      locked: false,
      cooldown: 0,
    };
    r.containers = [c];
    r.interact();
    r.take(0);
    expect(c.items).toHaveLength(0);
    expect(r.containers[0]).toBe(c);
    const count = r.stats.searches;
    r.interact();
    r.interact();
    expect(r.search).toBe(c);
    expect(r.inventory).toBe(true);
    expect(r.stats.searches).toBe(count);
  });
  it("Boss与普通敌猫死亡标记不同，装备和掉落数量沿用原逻辑", () => {
    const { r } = raid();
    const a = r.spawn(1000, 1000, 0, 1);
    r.kill(a);
    expect(r.containers.at(-1)?.bossLoot).toBe(false);
    const b = r.spawn(1000, 1000, bosses[0].breed, 2, bosses[0]);
    r.kill(b);
    expect(r.containers.at(-1)?.bossLoot).toBe(true);
    expect(r.containers.at(-1)?.items.length).toBeGreaterThanOrEqual(7);
  });
  it("装备、子弹和补给品使用与收藏品相同的品质名字颜色", () => {
    for (const d of Object.values(db))
      expect(itemNameColor(d.id)).toBe(collectibleColors[d.tier]);
  });
});
