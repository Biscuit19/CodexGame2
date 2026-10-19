import { beforeEach, describe, it, expect } from "vitest";
import { Raid, projectileFalloff } from "../../src/raid";
import { newSave, recoverInterrupted, validateSave } from "../../src/store";
import { makeItem, weapons, db, sale } from "../../src/data";
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
function start(map = 0, prepare?: (s: ReturnType<typeof newSave>) => void) {
  const s = newSave();
  prepare?.(s);
  const r = new Raid(
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
  it("连续受击保留容器搜索对象与当前进度，仍可完成揭示和拾取", () => {
    const { r, s } = start();
    const c = r.containers[0];
    r.p.x = c.x;
    r.p.y = c.y;
    c.items = [makeItem("c4_0")];
    c.revealed = 0;
    c.locked = false;
    r.startSearch(c);
    advance(r, 0.6);
    const before = r.searchProgress;
    for (let i = 0; i < 2; i++) r.hurtPlayer(5, 1);
    expect(r.p.hp).toBeLessThan(100);
    expect(r.search).toBe(c);
    expect(r.inventory).toBe(true);
    expect(r.searchProgress).toBe(before);
    advance(r, 0.5);
    expect(r.searchProgress).toBeGreaterThan(before);
    advance(r, 7);
    expect(c.revealed).toBe(1);
    r.take(0, false, true);
    expect(s.pack.some((i) => i.id === "c4_0")).toBe(true);
  });
  it("跑动留下稀疏交替脚印，暂停冻结，停止后两秒消失", () => {
    const { r } = start();
    r.walls = [];
    advance(r, 1, new Set(["KeyD"]));
    expect(r.footprints.length).toBeGreaterThanOrEqual(3);
    expect(r.footprints.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.footprints.length; i++) {
      expect(r.footprints[i].x - r.footprints[i - 1].x).toBeGreaterThan(45);
      expect(
        Math.abs(r.footprints[i].y - r.footprints[i - 1].y),
      ).toBeGreaterThan(8);
    }
    const life = r.footprints.map((f) => f.life);
    r.paused = true;
    advance(r, 3);
    expect(r.footprints.map((f) => f.life)).toEqual(life);
    r.paused = false;
    advance(r, 1);
    expect(r.footprints.every((f, i) => f.life < life[i])).toBe(true);
    advance(r, 1.01);
    expect(r.footprints).toHaveLength(0);
  });
  it("原地顶墙及整个翻滚过程中都不产生脚印", () => {
    const { r } = start();
    r.walls = [
      {
        x: r.p.x + 30,
        y: r.p.y,
        w: 30,
        h: 300,
        z: 30,
        color: "#444",
        type: "wall",
      },
    ];
    advance(r, 1, new Set(["KeyD"]));
    expect(r.footprints).toHaveLength(0);
    r.walls = [];
    const oldX = r.p.x;
    r.roll(1, 0);
    advance(r, 0.35, new Set(["KeyD"]));
    expect(r.p.x).toBeGreaterThan(oldX + 100);
    expect(r.footprints).toHaveLength(0);
    advance(r, 0.3, new Set(["KeyD"]));
    expect(r.footprints.length).toBeGreaterThan(0);
  });
  it("敌猫备弹在20至50发间随机，包含两端且并非固定数量", () => {
    const { r } = start();
    const amounts = new Set<number>();
    for (let n = 0; n < 240; n++) {
      const enemy = r.spawn(1000, 1000, 0, 1);
      r.kill(enemy);
      const corpse = r.containers.at(-1)!;
      const qty = corpse.items.find((i) => db[i.id].kind === "ammo")!.qty;
      expect(qty).toBeGreaterThanOrEqual(20);
      expect(qty).toBeLessThanOrEqual(50);
      amounts.add(qty);
    }
    expect(amounts.has(20)).toBe(true);
    expect(amounts.has(50)).toBe(true);
    expect(amounts.size).toBeGreaterThan(20);
  });
  it("进图选择最低品质食物，整堆逐份食用，吃完按品质自动续装直到无食物", () => {
    const { s, r } = start(0, (s) => {
      s.pack = [
        makeItem("f3"),
        makeItem("f2"),
        makeItem("f1", 2),
        makeItem("c1_9"),
      ];
    });
    expect(s.equipment.food?.id).toBe("f1");
    expect(s.equipment.food?.qty).toBe(2);
    expect(s.pack).toHaveLength(3);
    for (const [id, qty] of [
      ["f1", 1],
      ["c1_9", 1],
      ["f2", 1],
      ["f3", 1],
      [null, 0],
    ] as const) {
      r.p.hp = 1;
      r.useFood();
      for (let n = 0; n < 300 && r.heal > 0; n++) advance(r, 1 / 60);
      expect(s.equipment.food?.id ?? null).toBe(id);
      expect(s.equipment.food?.qty ?? 0).toBe(qty);
    }
    expect(s.pack).toHaveLength(0);
    r.useFood();
    expect(r.heal).toBe(0);
    r.abort();
    expect(s.equipment.food).toBeNull();
    expect(s.pack).toHaveLength(4);
  });

  it("空手搜刮前直接撤离价值为零，原有背包、安全箱、装备与弹匣均不计入", () => {
    const { s, r } = start(0, (s) => {
      s.pack = [makeItem("c4_0"), makeItem("f1", 5), makeItem("m2", 90)];
      s.secure = [makeItem("c5_14")];
      s.equipment.primary!.loaded = { tier: 1, count: 17 };
    });
    expect(r.extractedLootValue()).toBe(0);
    r.finish(true, "成功撤离");
    expect(s.result?.value).toBe(0);
    expect(s.stats.value).toBe(0);
    const carried = [
      ...s.pack,
      ...s.secure,
      ...Object.values(s.equipment).filter(Boolean),
    ];
    expect(
      carried.every(
        (i) =>
          i!.raidBrought === undefined && i!.loaded?.raidBrought === undefined,
      ),
    ).toBe(true);
    const next = new Raid(
      s,
      0,
      sound,
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(next.extractedLootValue()).toBe(0);
  });
  it("带入物丢弃重捡不计收益；新补给与弹药混堆、食用和丢弃后只计实际带回部分", () => {
    const { s, r } = start(0, (s) => {
      s.pack = [makeItem("f1", 4), makeItem("m2", 80), makeItem("c4_0")];
    });
    const original = s.pack.find((i) => i.id === "c4_0")!;
    r.dropItem(original.uid);
    const dropped = r.containers.find((c) =>
      c.items.some((i) => i.uid === original.uid),
    )!;
    r.startSearch(dropped);
    dropped.revealed = dropped.items.length;
    r.take(dropped.items.findIndex((i) => i.uid === original.uid));
    expect(r.extractedLootValue()).toBe(0);
    r.unequipToPack("food");
    const c = r.containers[0];
    c.items = [makeItem("f1", 4), makeItem("m2", 40)];
    c.revealed = 2;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    r.take(0);
    r.take(0);
    expect(r.extractedLootValue()).toBe(
      sale(makeItem("f1", 4)) + sale(makeItem("m2", 40)),
    );
    r.p.hp = 20;
    r.useFood();
    advance(r, 1.1);
    expect(r.extractedLootValue()).toBe(
      sale(makeItem("f1", 4)) + sale(makeItem("m2", 40)),
    );
    const newFood = s.pack.find((i) => i.id === "f1" && !i.raidBrought)!;
    r.dropItem(newFood.uid);
    r.finish(true, "成功撤离");
    expect(s.result?.value).toBe(
      sale(makeItem("f1", 1)) + sale(makeItem("m2", 40)),
    );
  });
  it("先吃掉自带补给后捡到同种补给仍计收益，直接穿戴的敌方护甲也计入", () => {
    const { s, r } = start(0, (s) => {
      s.pack = [makeItem("f1")];
    });
    r.p.hp = 20;
    r.useFood();
    advance(r, 1.1);
    const c = r.containers[0];
    c.items = [makeItem("f1"), makeItem("a5")];
    c.revealed = 2;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    r.take(0);
    expect(r.equipContainer(c.items[0].uid, "armor")).toBe(true);
    r.finish(true, "成功撤离");
    expect(s.result?.value).toBe(sale(makeItem("f1")) + sale(makeItem("a5")));
  });
  it("卸下所有枪械后仍可选择并补满备弹，空武器位不会阻止弹药装备", () => {
    const { s, r } = start();
    s.equipment.primary = null;
    s.equipment.secondary = null;
    r.activeWeapon = "primary";
    const ammo = makeItem("m2", 22);
    s.pack = [ammo, makeItem("m2", 120), makeItem("m2", 20)];
    expect(r.loadAmmo("pack", ammo.uid)).toBe(true);
    expect(s.equipment.ammo).toMatchObject({ id: "m2", qty: 120 });
    expect(s.pack.filter((i) => i.id === "m2").map((i) => i.qty)).toEqual([42]);
  });
  it("战斗拖弹立即换品质装弹，装填后自动补满备弹，带入弹药收益仍为零", () => {
    const { s, r } = start(0, (s) => {
      s.equipment.primary!.loaded = { tier: 1, count: 17 };
      s.equipment.ammo = makeItem("m1", 15);
      s.pack = [makeItem("m2", 22), makeItem("m2", 120), makeItem("m2", 20)];
    });
    const original = r.mag + s.equipment.ammo!.qty;
    const chosen = s.pack.find((i) => i.id === "m2")!;
    expect(r.loadAmmo("pack", chosen.uid, "primary")).toBe(true);
    expect(r.ammoTier).toBe(2);
    expect(r.mag).toBe(db[s.equipment.primary!.id].mag);
    expect(s.equipment.ammo).toMatchObject({ id: "m2", qty: 120 });
    expect(
      s.pack.filter((i) => i.id === "m1").reduce((n, i) => n + i.qty, 0),
    ).toBe(original);
    expect(r.extractedLootValue()).toBe(0);
    r.shoot();
    r.loadMagazine();
    r.finishReload();
    expect(s.equipment.ammo!.qty).toBe(120);
    expect(r.extractedLootValue()).toBe(0);
    const c = r.containers[0],
      ammo = makeItem("m4", 40);
    c.items = [ammo];
    c.revealed = 1;
    r.startSearch(c);
    expect(r.loadAmmo("loot", ammo.uid, "primary")).toBe(true);
    expect(c.items).toHaveLength(0);
    expect(c.revealed).toBe(0);
    expect(r.ammoTier).toBe(4);
    expect(r.mag + s.equipment.ammo!.qty).toBe(40);
    expect(r.extractedLootValue()).toBeGreaterThan(0);
  });
  it("带入弹药换装卸弹仍为零收益，新捡弹药装入原枪后仅计算未射出的新弹药", () => {
    const original = start(0, (s) => {
      s.equipment.primary!.loaded = { tier: 1, count: 30 };
      s.pack = [makeItem("m2", 40)];
    });
    original.r.switchAmmo(2);
    original.r.finishReload();
    expect(original.r.extractedLootValue()).toBe(0);
    expect(validateSave(structuredClone(original.s)).pending).toBe(true);
    const { s, r } = start(0, (s) => {
      s.pack = [];
      s.equipment.ammo = null;
      s.equipment.primary!.loaded = { tier: 2, count: 0 };
    });
    const c = r.containers[0];
    c.items = [makeItem("m2", 30)];
    c.revealed = 1;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    r.take(0);
    r.inventory = false;
    r.interrupt();
    r.finishReload();
    expect(r.mag).toBe(30);
    for (let n = 0; n < 5; n++) {
      r.fireCool = 0;
      r.shoot();
    }
    r.finish(true, "成功撤离");
    expect(s.result?.value).toBe(sale(makeItem("m2", 25)));
  });

  it("堆叠补给食用只扣一份，容器仍保留剩余堆叠与已搜索状态", () => {
    const { s, r } = start();
    r.p.hp = 20;
    s.pack = [makeItem("f1", 5)];
    r.useFood(s.pack[0].uid);
    advance(r, 1.1);
    expect(r.p.hp).toBe(32);
    expect(s.pack[0].qty).toBe(4);
    const c = r.containers[0];
    c.items = [makeItem("f1", 2)];
    c.revealed = 1;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    r.useFood(c.items[0].uid, "loot");
    advance(r, 1.1);
    expect(c.items[0].qty).toBe(1);
    expect(c.revealed).toBe(1);
    r.useFood(c.items[0].uid, "loot");
    advance(r, 1.1);
    expect(c.items).toHaveLength(0);
    expect(c.revealed).toBe(0);
    expect(r.p.hp).toBe(56);
  });
  it("十种补给分别提供小额即时、持续、混合恢复，持续部分不会提前到账", () => {
    for (const [id, instant, overtime, seconds] of [
      ["f1", 12, 0, 0],
      ["f2", 20, 0, 0],
      ["f3", 30, 0, 0],
      ["f4", 60, 0, 0],
      ["c1_1", 0, 32, 12],
      ["c1_9", 0, 22, 10],
      ["c1_10", 28, 0, 0],
      ["c3_1", 18, 0, 0],
      ["c4_11", 24, 48, 16],
      ["c4_8", 18, 28, 10],
    ] as const) {
      const { s, r } = start();
      s.pack = [makeItem(id)];
      r.p.hp = 20;
      r.useFood(s.pack[0].uid);
      for (let n = 0; n < 300 && r.heal > 0; n++) advance(r, 1 / 60);
      expect(r.heal, id).toBe(0);
      expect(s.pack, id).toHaveLength(0);
      expect(r.p.hp, id).toBeCloseTo(20 + instant, 6);
      advance(r, seconds || 2);
      expect(r.p.hp, id).toBeCloseTo(20 + instant + overtime, 5);
      expect(r.regeneration.remaining, id).toBeCloseTo(0, 5);
    }
  });
  it("持续回血移动不中断、暂停不计时、刷新不叠加、生命不超过100", () => {
    const { s, r } = start();
    r.walls = [];
    r.p.x = r.p.y = 1000;
    r.p.hp = 40;
    s.pack = [makeItem("c1_1"), makeItem("c1_9")];
    r.useFood(s.pack[0].uid);
    advance(r, 1.5);
    const afterEating = r.p.hp;
    advance(r, 2, new Set(["KeyD"]));
    expect(r.p.hp - afterEating).toBeCloseTo(32 / 6, 4);
    const hp = r.p.hp,
      time = r.regeneration.remaining;
    r.paused = true;
    advance(r, 5);
    expect(r.p.hp).toBe(hp);
    expect(r.regeneration.remaining).toBe(time);
    r.paused = false;
    r.useFood(s.pack[0].uid);
    for (let n = 0; n < 120 && r.heal > 0; n++) advance(r, 1 / 60);
    expect(r.regeneration.rate).toBe(2.2);
    expect(r.regeneration.remaining).toBe(10);
    r.p.hp = 99;
    advance(r, 10);
    expect(r.p.hp).toBe(100);
  });
  it("食用持续补给途中疾跑不中断，攻击才取消且不消耗物品", () => {
    const { s, r } = start();
    r.p.hp = 30;
    const food = makeItem("c4_11");
    s.pack = [food];
    r.useFood(food.uid);
    advance(r, 0.2, new Set(["KeyD"]));
    expect(r.heal).toBeGreaterThan(0);
    r.shoot();
    expect(r.heal).toBe(0);
    expect(r.p.hp).toBe(30);
    expect(s.pack[0].uid).toBe(food.uid);
    expect(r.regeneration.remaining).toBe(0);
  });
  it("满包仅搜索就点亮图鉴并只提示一次，死亡保留、主动退出撤销首次发现", () => {
    const { s, r } = start(),
      c = r.containers[0],
      messages: string[] = [];
    r.notify = (m) => messages.push(m);
    s.pack = Array.from({ length: 20 }, () => makeItem("c0_1"));
    c.items = [makeItem("c0_0")];
    c.revealed = 0;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    advance(r, 0.8);
    expect(c.revealed).toBe(1);
    expect(s.collection).toContain("c0_0");
    expect(s.discovered).toContain("c0_0");
    expect(s.pack.some((i) => i.id === "c0_0")).toBe(false);
    r.take(0);
    r.startSearch(c);
    expect(messages.filter((m) => m.includes("首次发现"))).toHaveLength(1);
    r.finish(false, "测试死亡");
    expect(s.collection).toContain("c0_0");
    const second = start();
    second.r.discover(makeItem("c5_14"));
    expect(second.s.collection).toContain("c5_14");
    second.r.abort();
    expect(second.s.collection).not.toContain("c5_14");
    expect(second.s.discovered).not.toContain("c5_14");
  });
  it("从背包或容器拖换当前主武器后使用新枪的真实弹种", () => {
    const { s, r } = start(),
      gun = makeItem("w16");
    gun.loaded = { tier: 4, count: 3 };
    s.pack = [gun];
    expect(r.equipLoot(gun.uid, false)).toBe(true);
    expect(r.mag).toBe(3);
    expect(r.ammoTier).toBe(4);
    const other = makeItem("w3");
    other.loaded = { tier: 2, count: 11 };
    const c = r.containers[0];
    c.items = [other];
    c.revealed = 1;
    r.search = c;
    expect(r.equipContainer(other.uid, "primary")).toBe(true);
    expect(r.mag).toBe(11);
    expect(r.ammoTier).toBe(2);
    expect(c.items[0].loaded).toEqual({ tier: 4, count: 3 });
    s.equipment.secondary = null;
    expect(r.swapWeapons("primary", "secondary")).toBe(true);
    expect(() => r.switchWeapon()).not.toThrow();
    expect(r.activeWeapon).toBe("melee");
    r.switchWeapon();
    expect(r.activeWeapon).toBe("secondary");
    expect(r.selectWeapon("primary")).toBe(false);
    expect(r.ammoTier).toBe(2);
  });
  it("滚轮按方向循环主枪、副枪和近战，跳过空位并保留各枪弹药", () => {
    const { s, r } = start();
    const secondary = makeItem("w16");
    secondary.loaded = { tier: 3, count: 4 };
    s.pack = [secondary];
    expect(r.equipLoot(secondary.uid, true)).toBe(true);
    r.mag = 17;
    for (const slot of ["secondary", "melee", "primary", "secondary"]) {
      r.switchWeapon(1);
      expect(r.activeWeapon).toBe(slot);
    }
    expect(r.mag).toBe(4);
    expect(r.ammoTier).toBe(3);
    r.switchWeapon(-1);
    expect(r.activeWeapon).toBe("primary");
    expect(r.mag).toBe(17);
    expect(r.ammoTier).toBe(1);
    r.switchWeapon(-1);
    expect(r.activeWeapon).toBe("melee");
    s.equipment.secondary = null;
    r.switchWeapon(-1);
    expect(r.activeWeapon).toBe("primary");
    s.equipment.primary = null;
    r.switchWeapon();
    expect(r.activeWeapon).toBe("melee");
  });
  it("只有收藏品触发首次发现，装备补给不写入发现记录，高品质重复搜索不弹右下角通知", () => {
    const { s, r } = start(),
      notices: string[] = [],
      discoveries: string[] = [];
    r.notify = (message) => notices.push(message);
    r.onDiscover = (item) => discoveries.push(item.id);
    for (const id of ["w3", "m4", "a5", "h5", "f4", "c1_9"])
      expect(r.discover(makeItem(id))).toBe(false);
    expect(s.discovered).toEqual([]);
    expect(discoveries).toEqual([]);
    const c = r.containers[0];
    c.x = r.p.x;
    c.y = r.p.y;
    for (let repeat = 0; repeat < 2; repeat++) {
      c.items = [makeItem("c4_0")];
      c.revealed = 0;
      r.startSearch(c);
      advance(r, 7.1);
    }
    expect(discoveries).toEqual(["c4_0"]);
    expect(s.collection).toEqual(["c4_0"]);
    expect(notices).toEqual([]);
  });
  it("战斗中拖换主副武器保持实际弹药、弹种，并支持空装备位", () => {
    const { s, r } = start(),
      a = s.equipment.primary!;
    r.mag = 17;
    r.ammoTier = 2;
    r.magazineTiers[a.uid] = 2;
    const b = makeItem("w16");
    b.loaded = { tier: 3, count: 4 };
    s.pack = [b];
    expect(r.equipLoot(b.uid, true)).toBe(true);
    r.reload = 1;
    expect(r.swapWeapons("primary", "secondary")).toBe(true);
    expect(r.weaponItem?.uid).toBe(b.uid);
    expect(r.mag).toBe(4);
    expect(r.ammoTier).toBe(3);
    expect(r.reload).toBe(0);
    expect(s.equipment.secondary?.loaded).toEqual({
      tier: 2,
      count: 17,
      raidBrought: 17,
    });
    expect(r.unequipToPack("primary")).toBe(true);
    expect(r.swapWeapons("secondary", "primary")).toBe(true);
    expect(r.weaponItem?.uid).toBe(a.uid);
    expect(r.mag).toBe(17);
    expect(r.ammoTier).toBe(2);
  });
  it("撤离结算价值按最后带出的背包和安全箱计算，不累计已丢弃物品", () => {
    const { s, r } = start();
    s.pack = [makeItem("f1"), makeItem("m2", 45)];
    s.secure = [makeItem("c4_0")];
    r.value = 999999;
    r.elapsed = 123;
    r.finish(true, "成功撤离");
    expect(s.result?.value).toBe(
      Math.floor(120 * 0.65) +
        Math.floor(360 * 0.65) +
        Math.floor(35000 * 0.65),
    );
    expect(s.result?.time).toBe(123);
  });
  it("霰弹一次产生7枚弹丸，只消耗1发子弹和一次耐久，远处实际命中伤害明显衰减", () => {
    const hits = (distance: number) => {
      const { s, r } = start();
      r.walls = [];
      r.p.x = 1000;
      r.p.y = 1000;
      r.p.angle = 0;
      s.equipment.primary = makeItem("w16");
      r.mag = 2;
      const target = r.spawn(1000 + distance, 1000, 0, 1);
      target.hp = target.maxHp = 1000;
      target.turret = true;
      target.cool = 999;
      const durability = s.equipment.primary.durability!;
      r.shoot();
      expect(r.mag).toBe(1);
      expect(r.bullets).toHaveLength(7);
      expect(new Set(r.bullets.map((b) => b.vy)).size).toBe(7);
      expect(r.combatFX.filter((f) => f.kind === "muzzle")).toHaveLength(1);
      expect(durability - s.equipment.primary.durability!).toBeCloseTo(
        100 / 700,
      );
      advance(r, 0.4);
      return r.stats.damageDealt;
    };
    const near = hits(80),
      far = hits(210);
    expect(near).toBeGreaterThan(40);
    expect(far).toBeGreaterThan(0);
    expect(near).toBeGreaterThan(far * 2);
  });
  it("敌猫的霰弹枪同样多弹丸射击，掉落实际枪械和已消耗耐久", () => {
    const { r } = start();
    r.walls = [];
    r.p.x = 1000;
    r.p.y = 1000;
    const e = r.spawn(1100, 1000, 0, 1);
    e.weapon = 16;
    e.weaponDurability = 100;
    e.mag = 6;
    e.cool = 0;
    e.state = "combat";
    r.updateEnemy(e, 1 / 60);
    expect(r.bullets).toHaveLength(7);
    expect(
      r.bullets.every((b) => !b.friendly && b.shotgun && b.range === 230),
    ).toBe(true);
    expect(e.mag).toBe(5);
    r.kill(e);
    const gun = r.containers
      .filter((c) => c.type === "corpse")
      .flatMap((c) => c.items)
      .find((i) => i.id === "w16");
    expect(gun?.durability).toBeCloseTo(100 - 100 / 700);
  });
  it("高阶枪耐久更高，实际射出700发降至零；30以下减伤，零耐久保留30%伤害", () => {
    expect(db.w11.durability!).toBeGreaterThan(db.w0.durability!);
    for (const id of ["w0", "w11"]) {
      const { s, r } = start();
      s.equipment.primary = makeItem(id);
      for (let shot = 0; shot < 700; shot++) {
        r.mag = 1;
        r.fireCool = 0;
        r.shoot();
        r.bullets = [];
      }
      expect(s.equipment.primary!.durability).toBe(0);
      r.mag = 1;
      r.fireCool = 0;
      r.shoot();
      expect(r.bullets[0].damage).toBeCloseTo(db[id].damage! * 0.3);
      s.equipment.primary!.durability = 30;
      r.mag = 1;
      r.fireCool = 0;
      r.shoot();
      expect(r.bullets.at(-1)!.damage).toBe(db[id].damage);
      s.equipment.primary!.durability = 15;
      r.mag = 1;
      r.fireCool = 0;
      r.shoot();
      expect(r.bullets.at(-1)!.damage).toBeCloseTo(db[id].damage! * 0.65);
    }
  });
  it("发现玩家会通知同房间敌猫，隔墙远处敌人不会全图仇恨", () => {
    const { r } = start();
    r.p.x = 1000;
    r.p.y = 1000;
    const a = r.spawn(1100, 1000, 0, 1),
      b = r.spawn(1200, 1000, 0, 1),
      far = r.spawn(2000, 1000, 0, 1);
    r.updateEnemy(a, 1 / 60);
    expect(b.state).toBe("combat");
    expect(b.target).toEqual({ x: 1000, y: 1000 });
    expect(far.state).toBe("patrol");
  });
  it("容器食物可原地食用，近战不会消耗枪内或装备栏子弹", () => {
    const { r, s } = start(),
      c = r.containers[0];
    c.items = [makeItem("f2")];
    c.revealed = 1;
    c.x = r.p.x;
    c.y = r.p.y;
    r.startSearch(c);
    r.p.hp = 50;
    r.useFood(c.items[0].uid, "loot");
    advance(r, 1.6);
    expect(r.p.hp).toBe(70);
    expect(c.items).toHaveLength(0);
    r.interrupt();
    r.inventory = false;
    r.p.x = 1000;
    r.p.y = 1000;
    r.p.angle = 0;
    const e = r.spawn(1050, 1000, 0, 1);
    e.cool = 999;
    const mag = r.mag,
      ammo = s.equipment.ammo!.qty;
    r.activeWeapon = "melee";
    r.shoot();
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(s.equipment.ammo!.qty).toBe(ammo);
    expect(s.equipment.primary!.loaded!.count).toBe(mag);
  });
  it("满包双击更强头甲直接交换，旧甲留在已揭示容器；弱甲只拾取", () => {
    const { s, r } = start();
    s.pack = Array.from({ length: 20 }, () => makeItem("c0_0"));
    const armor = makeItem("a3"),
      old = s.equipment.armor!;
    const c = r.containers[0];
    c.items = [armor];
    c.revealed = 1;
    r.startSearch(c);
    r.take(0, false, true);
    expect(s.equipment.armor!.uid).toBe(armor.uid);
    expect(c.items[0].uid).toBe(old.uid);
    expect(c.revealed).toBe(1);
    expect(s.pack).toHaveLength(20);
    r.take(0, false, true);
    expect(s.equipment.armor!.uid).toBe(armor.uid);
    expect(c.items).toHaveLength(1);
    s.pack.pop();
    r.take(0, false, true);
    expect(s.pack.some((i) => i.uid === old.uid)).toBe(true);
  });
  it("玩家和敌人发射与命中均产生有时效的可视反馈", () => {
    const { r } = start();
    r.addBullet(1000, 1000, 0, true, 20, 1);
    r.addBullet(1200, 1000, Math.PI, false, 20, 1);
    expect(r.combatFX.filter((f) => f.kind === "muzzle")).toHaveLength(2);
    r.hurtPlayer(5, 1);
    expect(r.combatFX.some((f) => f.kind === "hit" && !f.friendly)).toBe(true);
    advance(r, 0.7);
    expect(r.combatFX).toHaveLength(0);
  });
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
  it("默认疾跑每秒220，持刀加速至270，Shift不改变速度", () => {
    const { r } = start();
    r.p.x = 1000;
    r.p.y = 1550;
    advance(r, 0.2, new Set(["KeyD"]));
    expect(r.p.x - 1000).toBeCloseTo(44, 1);
    let x = r.p.x;
    advance(r, 0.2, new Set(["KeyD", "ShiftLeft"]));
    expect(r.p.x - x).toBeCloseTo(44, 1);
    r.activeWeapon = "melee";
    x = r.p.x;
    advance(r, 0.2, new Set(["KeyD"]));
    expect(r.p.x - x).toBeCloseTo(54, 1);
  });
  it("停止疾跑的第一帧立即恢复体力，疲劳行走和翻滚中同样恢复", () => {
    const { r } = start();
    r.p.stamina = 50;
    advance(r, 0.1, new Set(["KeyD"]));
    const drained = r.p.stamina;
    advance(r, 1 / 60);
    expect(r.p.stamina).toBeGreaterThan(drained);
    r.p.exhausted = true;
    r.p.stamina = 5;
    advance(r, 1 / 60, new Set(["KeyD"]));
    expect(r.p.stamina).toBeGreaterThan(5);
    r.p.stamina = 50;
    r.p.rollCooldown = 0;
    r.roll(1, 1);
    const afterRoll = r.p.stamina;
    advance(r, 1 / 60, new Set(["KeyD"]));
    expect(r.p.stamina).toBeGreaterThan(afterRoll);
  });
  it("满体力100可持续跑30秒，耗尽疲劳，休息后自动恢复", () => {
    const { r } = start();
    r.width = 20000;
    r.walls = [];
    r.exits = [];
    r.containers = [];
    r.p.x = 1000;
    r.p.y = 1000;
    expect(r.p.stamina).toBe(100);
    advance(r, 15, new Set(["KeyD"]));
    expect(r.p.stamina).toBeCloseTo(50, 5);
    advance(r, 15, new Set(["KeyD"]));
    expect(r.p.stamina).toBe(0);
    expect(r.p.exhausted).toBe(true);
    advance(r, 2);
    expect(r.p.exhausted).toBe(false);
    expect(r.movementSpeed).toBe(220);
    advance(r, 5);
    expect(r.p.stamina).toBe(100);
  });
  it("翻滚恰好消耗10点体力，不足10点不能翻滚", () => {
    const { r } = start();
    r.roll(1, 0);
    expect(r.p.stamina).toBe(90);
    r.p.roll = 0;
    r.p.rollCooldown = 0;
    r.p.stamina = 9;
    r.roll(1, 0);
    expect(r.p.roll).toBe(0);
    expect(r.p.stamina).toBe(9);
    r.p.stamina = 10;
    r.roll(1, 0);
    expect(r.p.stamina).toBe(0);
    expect(r.p.roll).toBeGreaterThan(0);
    expect(r.p.exhausted).toBe(true);
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
    r.interact();
    expect(r.inventory).toBe(false);
    expect(r.search).toBeUndefined();
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
      const grid = map === 0 ? 16 : 40;
      const first = {
        x: Math.floor(r.p.x / grid) * grid + grid / 2,
        y: Math.floor(r.p.y / grid) * grid + grid / 2,
      };
      const queue = [first],
        visited = new Set([`${first.x},${first.y}`]);
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        for (const [dx, dy] of [
          [grid, 0],
          [-grid, 0],
          [0, grid],
          [0, -grid],
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
          `${map}:${c.name} ${c.x},${c.y}`,
        ).toBe(true);
    }
  });
  it("20 把武器都能发射、换弹后继续射击，翻滚结束不会卡死", () => {
    for (const w of weapons) {
      const { s, r } = start();
      s.equipment.primary = makeItem(w.id);
      r.magazines[s.equipment.primary.uid] = 1;
      r.fireCool = 0;
      const count = r.stats.damageDealt;
      r.shoot();
      expect(r.mag).toBe(0);
      expect(r.bullets).toHaveLength(w.pellets!);
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
  it("站立和疾跑均可进食，只有攻击和翻滚会打断", () => {
    const { s, r } = start();
    r.p.hp = 30;
    r.useFood();
    advance(r, 1.2);
    expect(r.p.hp).toBe(42);
    expect(r.heal).toBe(0);
    r.useFood();
    advance(r, 1.6);
    expect(r.p.hp).toBe(62);
    s.pack.push(makeItem("f3"));
    r.useFood();
    advance(r, 0.1, new Set(["KeyD"]));
    expect(r.heal).toBeGreaterThan(0);
    r.hurtPlayer(1, 1);
    expect(r.heal).toBeGreaterThan(0);
    r.roll(1, 0);
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
  it("撤离要连续停留三秒，离圈重置，付费点先扣款一次", () => {
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
    advance(r, 1.5);
    expect(r.done).toBe(false);
    r.p.x -= 100;
    advance(r, 0.1);
    expect(r.extract).toBe(0);
    r.p.x += 100;
    advance(r, 3.2);
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
  it("枪内弹药保留在武器上，满包撤离不生成溢出物品，下一局弹药守恒", () => {
    const { s, r } = start();
    s.pack = Array.from({ length: 20 }, () => makeItem("c0_0"));
    r.mag = 25;
    r.syncLoaded();
    const reserve = s.equipment.ammo!.qty;
    r.finish(true, "test");
    expect(s.pack).toHaveLength(20);
    expect(s.overflow).toHaveLength(0);
    expect(s.equipment.primary!.loaded!.count).toBe(25);
    const restored = validateSave(s);
    const next = new Raid(
      restored,
      0,
      sound,
      () => {},
      () => {},
      () => {},
      44,
    );
    expect(next.mag + restored.equipment.ammo!.qty).toBe(25 + reserve);
    expect(restored.overflow).toHaveLength(0);
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
