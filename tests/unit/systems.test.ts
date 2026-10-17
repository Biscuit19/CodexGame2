import { describe, it, expect, beforeEach } from "vitest";
import {
  items,
  collectibles,
  weapons,
  bosses,
  db,
  makeItem,
  mathQuestion,
  rng,
  damage,
  searchTime,
  sale,
  randomWeapon,
} from "../../src/data";
import {
  newSave,
  settle,
  beginRaid,
  move,
  equip,
  upgradeSafe,
  upgradeWarehouse,
  buy,
  repair,
  validateSave,
  persist,
  recoverInterrupted,
  put,
  canPut,
  load,
  normalizeAmmo,
  stashAll,
  sell,
  swapWeaponSlots,
  type Result,
  newTestingSave,
  unlocked,
  buyBack,
} from "../../src/store";
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  },
});
beforeEach(() => memory.clear());
const result = (success: boolean, bosses: string[] = []): Result => ({
  success,
  reason: "test",
  map: 0,
  kills: 2,
  searches: 3,
  time: 80,
  value: 500,
  damageDealt: 200,
  damageTaken: 30,
  bosses,
  reward: success ? 300 : 0,
});
describe("配置与战斗", () => {
  it("全部物品使用独立幽默描述，70件收藏分布为8、9、25、16、12，旧编号保留", () => {
    expect(collectibles).toHaveLength(70);
    expect(new Set(items.map((i) => i.desc)).size).toBe(items.length);
    expect(
      [1, 2, 3, 4, 5].map(
        (t) => collectibles.filter((i) => i.tier === t).length,
      ),
    ).toEqual([8, 9, 25, 16, 12]);
    expect(db.c2_4.tier).toBe(4);
    expect(db.c4_1.tier).toBe(5);
    expect(db.c4_9.tier).toBe(5);
    for (let group = 0; group < 5; group++)
      for (let n = 0; n < 12; n++) expect(db[`c${group}_${n}`]).toBeDefined();
    expect(db.c2_6.tier).toBe(4);
    expect(db.c2_7.desc).toBe("车不一定会来，附近的猫一定会来。");
    expect(db.c4_8.tier).toBe(2);
    expect(db.c4_0.name).toBe("星洲猫心");
    expect(searchTime(makeItem("c4_0"))).toBe(7);
  });
  it("主副武器原地互换与移入空位不占仓库空间，也不丢弹匣", () => {
    const s = newSave(),
      a = makeItem("w3"),
      b = makeItem("w16");
    a.loaded = { tier: 2, count: 17 };
    b.loaded = { tier: 1, count: 4 };
    s.equipment.primary = a;
    s.equipment.secondary = b;
    const stash = s.stash.length;
    expect(swapWeaponSlots(s, "primary", "secondary")).toBe(true);
    expect(s.equipment.primary).toBe(b);
    expect(s.equipment.secondary).toBe(a);
    expect(s.equipment.secondary?.loaded).toEqual({ tier: 2, count: 17 });
    s.equipment.primary = null;
    expect(swapWeaponSlots(s, "secondary", "primary")).toBe(true);
    expect(s.equipment.primary).toBe(a);
    expect(s.equipment.secondary).toBeNull();
    expect(s.stash).toHaveLength(stash);
  });
  it("四张地图按解锁阶梯刷新全部20款枪，传说枪明显更少", () => {
    const random = rng(2026),
      found = new Set<string>();
    let legendary = 0;
    for (let map = 0; map < 4; map++) {
      for (let n = 0; n < 5000; n++) {
        const w = randomWeapon(random, map);
        expect(w.unlock).toBeLessThanOrEqual(map);
        if (map === 3) {
          found.add(w.id);
          if (w.tier === 5) legendary++;
        }
      }
    }
    expect(found.size).toBe(20);
    expect(legendary).toBeLessThan(250);
  });
  it("旧版武器与已装填子弹保留，替换名称后不缩小旧弹匣", () => {
    const s = newSave();
    for (const [id, count] of [
      ["w1", 40],
      ["w2", 25],
      ["w5", 25],
      ["w8", 15],
      ["w11", 3],
    ] as const) {
      const i = makeItem(id);
      i.loaded = { tier: 1, count };
      s.stash.push(i);
    }
    const restored = validateSave(s);
    expect(
      restored.stash.filter((i) => i.loaded).map((i) => i.loaded!.count),
    ).toEqual([40, 25, 25, 15, 3]);
    expect(db.w3.name).toBe("三尾47");
  });
  it("完整内容表，物品 id 唯一，六名主线首领", () => {
    expect(weapons).toHaveLength(20);
    expect(weapons.filter((w) => w.weaponClass === "smg")).toHaveLength(5);
    expect(weapons.filter((w) => w.weaponClass === "rifle")).toHaveLength(8);
    expect(weapons.filter((w) => w.weaponClass === "sniper")).toHaveLength(3);
    expect(weapons.filter((w) => w.weaponClass === "shotgun")).toHaveLength(4);
    expect(collectibles).toHaveLength(70);
    expect(bosses.filter((b) => b.map === 3)).toHaveLength(3);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });
  it("生成一万道合法保险箱题，唯一答案且都在 10 以内", () => {
    const r = rng(42);
    for (let i = 0; i < 10000; i++) {
      const q = mathQuestion(r),
        [a, op, b] = q.text.split(" ");
      expect(Number(a)).toBeLessThanOrEqual(10);
      expect(Number(b)).toBeLessThanOrEqual(10);
      const answer =
        op === "+"
          ? +a + +b
          : op === "−"
            ? +a - +b
            : op === "×"
              ? +a * +b
              : +a / +b;
      expect(answer).toBe(q.answer);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(10);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices.filter((x) => x === answer)).toHaveLength(1);
    }
  });
  it("高阶弹穿甲更强，破甲失去保护", () => {
    expect(damage(30, 4, 2, 60)).toBeGreaterThan(damage(30, 1, 2, 60));
    expect(damage(30, 1, 5, 0)).toBeGreaterThan(damage(30, 1, 5, 100));
    expect(damage(30, 2, 2, 60, true)).toBe(damage(30, 2, 2, 60) * 1.5);
  });
  it("搜索按实际价值，星洲猫心需要七秒，出售为 65%", () => {
    expect(searchTime(makeItem("c4_0"))).toBe(7);
    expect(searchTime(makeItem("c0_0"))).toBeLessThan(1);
    expect(sale(makeItem("w0"))).toBe(585);
    expect(sale(makeItem("m1", 15))).toBe(29);
  });
});
describe("物品、经济与死亡事务", () => {
  it("补给自动合并为每格5份，余量另开格，不同补给不混合", () => {
    const list = [makeItem("f1", 4), makeItem("f2", 2)];
    expect(put(list, makeItem("f1", 3), 3)).toBe(true);
    expect(list.map((i) => [i.id, i.qty])).toEqual([
      ["f1", 5],
      ["f2", 2],
      ["f1", 2],
    ]);
    const sum = list.reduce((n, i) => n + i.qty, 0);
    normalizeAmmo(list);
    expect(list.reduce((n, i) => n + i.qty, 0)).toBe(sum);
    const s = newSave();
    s.pack = [makeItem("f1"), makeItem("f1", 4), makeItem("f1", 2)];
    expect(validateSave(s).pack.map((i) => i.qty)).toEqual([5, 2]);
    s.pack = [makeItem("f1", 6)];
    expect(() => validateSave(s)).toThrow();
  });
  it("满容量补给堆叠移动失败不部分转移，有空格则守恒分堆", () => {
    const list = [makeItem("f1", 4)],
      item = makeItem("f1", 2),
      before = structuredClone(list);
    expect(canPut(list, item, 1)).toBe(false);
    expect(put(list, item, 1)).toBe(false);
    expect(list).toEqual(before);
    expect(item.qty).toBe(2);
    expect(put(list, item, 2)).toBe(true);
    expect(list.map((i) => i.qty)).toEqual([5, 1]);
    expect(new Set(list.map((i) => i.uid)).size).toBe(2);
  });
  it("整堆补给按份数出售与死亡回购，售价仍为65%", () => {
    const s = newSave();
    s.pack = [makeItem("f1", 5)];
    expect(sale(s.pack[0])).toBe(390);
    beginRaid(s);
    settle(s, result(false));
    const lost = s.buyback.find((i) => i.id === "f1")!,
      coins = s.coins;
    expect(buyBack(s, lost.uid)).toBe(true);
    expect(s.coins).toBe(coins - 600);
    const food = s.stash.find((i) => i.id === "f1")!;
    expect(food.qty).toBe(5);
    expect(sell(s, "stash", food.uid)).toBe(390);
  });
  it("测试权限资金与地图图鉴全解锁，购买、设置、死亡结算都不写正式存档", () => {
    const real = newSave();
    persist(real);
    const before = [...memory.entries()];
    const s = newTestingSave();
    expect(s.coins).toBe(999999);
    expect(unlocked(s)).toBe(3);
    expect(s.collection).toHaveLength(70);
    expect(buy(s, "f1")).toBe(true);
    s.settings.master = 0.2;
    persist(s);
    beginRaid(s);
    settle(s, result(false));
    persist(s);
    expect([...memory.entries()]).toEqual(before);
  });
  it("旧收藏里的五件补给迁移后仍保留实物和发现记录，不再占图鉴数量", () => {
    const s = newSave();
    const ids = ["c1_1", "c1_9", "c1_10", "c3_1", "c4_11"];
    s.collection = [...ids, "c4_0"];
    s.pack = ids.map((id) => makeItem(id));
    delete s.discovered;
    const migrated = validateSave(s);
    expect(migrated.collection).toEqual(["c4_0"]);
    expect(migrated.discovered).toEqual([...ids, "c4_0"]);
    expect(migrated.pack.map((i) => i.id)).toEqual(ids);
    for (const id of ids) expect(db[id].kind).toBe("food");
  });
  it("全部放回保留装备，仓库不足时留下背包余物，背包可直接出售", () => {
    const s = newSave(),
      equipment = structuredClone(s.equipment);
    expect(stashAll(s).left).toBe(0);
    expect(s.pack).toHaveLength(0);
    expect(s.equipment).toEqual(equipment);
    s.stash = Array.from({ length: 59 }, () => makeItem("c0_0"));
    s.pack = [makeItem("f1"), makeItem("f2")];
    expect(stashAll(s)).toEqual({ moved: 1, left: 1 });
    expect(s.stash).toHaveLength(60);
    const i = s.pack[0],
      coins = s.coins;
    expect(sell(s, "pack", i.uid)).toBe(sale(i));
    expect(s.coins).toBe(coins + sale(i));
    expect(s.pack).toHaveLength(0);
  });
  it("武器修复降低最大耐久，旧存档无耐久枪械自动补齐", () => {
    const s = newSave(),
      gun = s.equipment.primary!;
    gun.durability = 0;
    s.coins = 10000;
    expect(repair(s, "primary")).toBe(true);
    expect(gun.maxDurability).toBeCloseTo(88);
    expect(gun.durability).toBeCloseTo(88);
    const other = s.stash.find((i) => i.id === "w3")!;
    other.durability = 10;
    expect(repair(s, other)).toBe(true);
    expect(other.maxDurability).toBeLessThan(db.w3.durability!);
    delete gun.durability;
    delete gun.maxDurability;
    const migrated = validateSave(s);
    expect(migrated.equipment.primary!.durability).toBe(db.w0.durability);
  });
  it("同级子弹始终合并至90发，不同等级分开且旧存档迁移不丢物品", () => {
    const list = [
      makeItem("m1", 30),
      makeItem("m1", 30),
      makeItem("m1", 20),
      makeItem("m2", 30),
    ];
    normalizeAmmo(list);
    expect(list.filter((i) => i.id === "m1")).toHaveLength(1);
    expect(list[0].qty).toBe(80);
    expect(put(list, makeItem("m1", 20), 3)).toBe(true);
    expect(list.filter((i) => i.id === "m1").map((i) => i.qty)).toEqual([
      90, 10,
    ]);
    const s = newSave();
    delete (s.equipment as any).ammo;
    delete (s.equipment as any).melee;
    s.overflow = [makeItem("m1", 30)];
    s.loadedRounds = [{ weapon: s.equipment.primary!.uid, tier: 1, count: 15 }];
    const loaded = validateSave(s);
    expect(loaded.equipment.primary!.loaded!.count).toBe(15);
    expect(loaded.overflow).toHaveLength(0);
    expect(loaded.equipment.melee!.id).toBe("k0");
    expect(loaded.stash.find((i) => i.id === "m1")!.qty).toBe(90);
  });
  it("成功撤离保留背包、仓库不变，空仓位仍可使用", () => {
    const s = newSave(),
      loot = makeItem("c4_0");
    s.pack.push(loot);
    const pack = structuredClone(s.pack),
      stash = structuredClone(s.stash);
    beginRaid(s);
    settle(s, result(true));
    expect(s.pack).toEqual(pack);
    expect(s.stash).toEqual(stash);
    expect(s.overflow).toHaveLength(0);
    expect(move(s, "pack", "stash", loot.uid)).toBe(true);
    expect(s.stash.some((i) => i.uid === loot.uid)).toBe(true);
  });
  it("满背包可直接替换护甲，背包缩容失败不会改动任何物品", () => {
    const s = newSave();
    s.pack = Array.from({ length: 19 }, () => makeItem("c0_0"));
    const a = makeItem("a2");
    s.pack.push(a);
    const old = s.equipment.armor!.uid;
    expect(equip(s, "pack", a.uid)).toBe(true);
    expect(s.pack).toHaveLength(20);
    expect(s.pack.some((i) => i.uid === old)).toBe(true);
    s.equipment.bag = makeItem("b3");
    s.pack = Array.from({ length: 25 }, () => makeItem("c0_0"));
    const bag = makeItem("b1");
    s.stash.push(bag);
    const before = structuredClone(s);
    expect(equip(s, "stash", bag.uid)).toBe(false);
    expect(s).toEqual(before);
  });
  it("空间不足的移动不会丢失或复制弹药", () => {
    const s = newSave();
    s.pack = Array.from({ length: 19 }, () => makeItem("c0_0"));
    s.pack.push(makeItem("m1", 89));
    const i = makeItem("m1", 30);
    s.stash = [i];
    expect(move(s, "stash", "pack", i.uid)).toBe(false);
    expect(s.pack.at(-1)!.qty).toBe(89);
    expect(s.stash[0].qty).toBe(30);
  });
  it("合并不足 30 发的弹药，装备交换保留原物品", () => {
    const s = newSave(),
      i = makeItem("m1", 10);
    s.pack = [makeItem("m1", 20)];
    s.stash = [i];
    expect(move(s, "stash", "pack", i.uid)).toBe(true);
    expect(s.pack).toHaveLength(1);
    expect(s.pack[0].qty).toBe(30);
    const w = makeItem("w3"),
      old = s.equipment.primary!.uid;
    s.stash = [w];
    expect(equip(s, "stash", w.uid)).toBe(true);
    expect(s.equipment.primary!.uid).toBe(w.uid);
    expect(s.stash.some((i) => i.uid === old)).toBe(true);
  });
  it("默认安全箱赠送，二三级可跳买，四级受猫伊德门槛限制", () => {
    const s = newSave();
    s.coins = 1e6;
    expect(s.safe).toBe(0);
    expect(upgradeSafe(s, 2)).toBe(true);
    expect(s.safe).toBe(2);
    expect(upgradeSafe(s, 3)).toBe(false);
    s.defeated = ["iron", "swift", "yeed"];
    expect(upgradeSafe(s, 3)).toBe(true);
  });
  it("升级容量与修复最大耐久损耗", () => {
    const s = newSave();
    s.coins = 1e6;
    expect(upgradeWarehouse(s)).toBe(true);
    expect(s.warehouse).toBe(1);
    s.equipment.armor!.durability = 10;
    expect(repair(s, "armor")).toBe(true);
    expect(s.equipment.armor!.maxDurability).toBeCloseTo(36.4);
    expect(s.equipment.armor!.durability).toBeCloseTo(36.4);
  });
  it("购买不足金币或锁定物品不扣款", () => {
    const s = newSave(),
      coins = s.coins;
    expect(buy(s, "w11")).toBe(false);
    expect(s.coins).toBe(coins);
    s.coins = 0;
    expect(buy(s, "f1")).toBe(false);
  });
  it("轻松模式死亡保留全部物品，装备耐久保持损耗", () => {
    const s = newSave(),
      loot = makeItem("c4_0");
    s.mode = "easy";
    s.pack.push(loot);
    s.equipment.armor!.durability = 20;
    beginRaid(s);
    expect(settle(s, result(false))).toBe(true);
    expect(s.stash.some((i) => i.uid === loot.uid)).toBe(true);
    expect(s.equipment.armor!.durability).toBe(20);
    expect(s.stats.deaths).toBe(1);
    expect(settle(s, result(false))).toBe(false);
    expect(s.stats.deaths).toBe(1);
  });
  it("标准模式死亡丢失背包和装备，安全箱保留，仓库不受影响", () => {
    const s = newSave();
    s.mode = "standard";
    const loot = makeItem("c4_0");
    s.secure = [loot];
    const stash = s.stash.length;
    beginRaid(s);
    settle(s, result(false));
    expect(s.equipment.primary).toBeNull();
    expect(s.pack).toHaveLength(0);
    expect(s.secure[0].uid).toBe(loot.uid);
    expect(s.stash.length).toBe(stash);
    expect(s.buyback.length).toBeGreaterThan(0);
  });
  it("密钥与通关只在撤离成功后保存，结算幂等", () => {
    const s = newSave();
    s.mode = "easy";
    beginRaid(s);
    settle(s, result(false, ["iron"]));
    expect(s.defeated).not.toContain("iron");
    beginRaid(s);
    settle(s, result(true, ["iron", "swift", "yeed", "maine", "frost"]));
    expect(s.completed).toBe(false);
    beginRaid(s);
    settle(s, result(true, ["doctor"]));
    expect(s.completed).toBe(true);
    const coins = s.coins;
    expect(settle(s, result(true, ["doctor"]))).toBe(false);
    expect(s.coins).toBe(coins);
  });
  it("中断恢复遵守死亡模式，非法存档拒绝并回退备份", async () => {
    const s = newSave();
    persist(s);
    const good = structuredClone(s);
    beginRaid(s);
    recoverInterrupted(s);
    expect(s.pending).toBe(false);
    expect(s.stats.deaths).toBe(1);
    expect(() => validateSave({ ...s, coins: -1 })).toThrow();
    const bad = structuredClone(s);
    bad.secure = [makeItem("w0"), makeItem("w0")];
    expect(() => validateSave(bad)).toThrow();
    memory.set("tricat.save.0", "bad json");
    memory.set("tricat.save.0.bak", JSON.stringify(good));
    expect((await load(0))?.coins).toBe(good.coins);
  });
});
