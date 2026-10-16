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
  type Result,
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
  it("完整内容表，物品 id 唯一，六名主线首领", () => {
    expect(weapons).toHaveLength(12);
    expect(collectibles).toHaveLength(60);
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
  it("空间不足的移动不会丢失或复制弹药", () => {
    const s = newSave();
    s.pack = Array.from({ length: 7 }, () => makeItem("f1"));
    s.pack.push(makeItem("m1", 29));
    const i = makeItem("m1", 30);
    s.stash = [i];
    expect(move(s, "stash", "pack", i.uid)).toBe(false);
    expect(s.pack.at(-1)!.qty).toBe(29);
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
