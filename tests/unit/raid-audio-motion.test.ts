import { beforeEach, it, expect, vi } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { makeItem, db, searchTime } from "../../src/data";
import { sampleChoice } from "../../src/audio-samples";
import { reloadPose } from "../../src/reload-motion";
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
  },
  window: {},
});
function start() {
  const s = newSave(),
    sound = {
      mode: "base",
      play: vi.fn(),
      stopReload: vi.fn(),
      stopFood: vi.fn(),
    };
  const r = new Raid(
    s,
    1,
    sound as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  r.walls = [];
  return { s, r, sound };
}
beforeEach(() => memory.clear());
it("切换空枪立即按本枪时长换弹，已装填枪及无备弹不误换", () => {
  const { r, s, sound } = start();
  const w = makeItem("w3");
  s.equipment.secondary = w;
  r.magazines[w.uid] = 0;
  r.magazineTiers[w.uid] = 1;
  expect(r.selectWeapon("secondary")).toBe(true);
  expect(r.reload).toBe(db.w3.reload);
  expect(r.mag).toBe(0);
  expect(sound.play).toHaveBeenCalledWith("reload", 1, {
    weaponClass: db.w3.weaponClass,
    seconds: db.w3.reload,
  });
  const duration = r.reload;
  r.selectWeapon("secondary");
  expect(r.reload).toBe(duration);
  r.finishReload();
  expect(r.mag).toBeGreaterThan(0);
  r.selectWeapon("melee");
  sound.play.mockClear();
  r.selectWeapon("secondary");
  expect(r.reload).toBe(0);
  expect(sound.play.mock.calls.some((c) => c[0] === "reload")).toBe(false);
  r.selectWeapon("melee");
  r.magazines[w.uid] = 0;
  s.pack = [];
  s.equipment.ammo = null;
  sound.play.mockClear();
  r.selectWeapon("secondary");
  expect(r.reload).toBe(0);
  expect(sound.play.mock.calls.some((c) => c[0] === "reload")).toBe(false);
});
it("翻滚与行走同样绕开小角，完整墙面及不可通行处不穿越", () => {
  for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4]) {
    const { r } = start(),
      ux = Math.cos(a),
      uy = Math.sin(a);
    Object.assign(r.p, { x: 500, y: 500, roll: 0.3 });
    r.walls = [
      {
        x: 500 + 40 * ux,
        y: 500 + 40 * uy,
        w: 20,
        h: 20,
        z: 30,
        color: "#444",
        rotation: a,
      },
    ];
    r.moveActor(r.p, ux * 136, uy * 136);
    expect((r.p.x - 500) * ux + (r.p.y - 500) * uy).toBeGreaterThan(75);
    expect(r.blocked(r.p.x, r.p.y)).toBe(false);
  }
  const { r } = start();
  Object.assign(r.p, { x: 500, y: 500, roll: 0.3 });
  r.walls = [{ x: 540, y: 500, w: 4, h: 400, z: 30, color: "#444" }];
  r.moveActor(r.p, 200, 0);
  expect(r.p.x).toBeLessThan(525);
  expect(r.p.y).toBe(500);
});
it("首次四五级只触发解锁声，重复与三级按正常发现；重新打开不再解锁", () => {
  for (const tier of [1, 2, 3, 4, 5]) {
    const { s, r, sound } = start();
    s.collection = [];
    s.discovered = [];
    const item = makeItem(
      Object.values(db).find(
        (d) => d.kind === "collectible" && d.tier === tier,
      )!.id,
    );
    const c: any = {
      x: r.p.x + 10,
      y: r.p.y,
      type: "safe",
      name: "测试",
      items: [item],
      revealed: 0,
      open: false,
      locked: false,
      cooldown: 0,
    };
    r.startSearch(c);
    sound.play.mockClear();
    r.searchProgress = searchTime(item) - 0.001;
    r.update(0.02, new Set(), { x: r.p.x + 200, y: r.p.y - 24, down: false });
    const reveal = sound.play.mock.calls.filter(
      (c) => c[0] === "loot" || c[0] === "unlock",
    );
    expect(reveal.map((c) => [c[0], c[1]])).toEqual([
      [tier >= 4 ? "unlock" : "loot", tier],
    ]);
    sound.play.mockClear();
    r.startSearch(c);
    expect(
      sound.play.mock.calls.some((c) => c[0] === "unlock" || c[0] === "loot"),
    ).toBe(false);
    const duplicate: any = { ...c, items: [makeItem(item.id)], revealed: 0 };
    r.startSearch(duplicate);
    sound.play.mockClear();
    r.searchProgress = searchTime(item) - 0.001;
    r.update(0.02, new Set(), { x: r.p.x + 200, y: r.p.y - 24, down: false });
    expect(
      sound.play.mock.calls
        .filter((c) => c[0] === "loot" || c[0] === "unlock")
        .map((c) => [c[0], c[1]]),
    ).toEqual([["loot", tier]]);
  }
});
it("统一发现增益、首刀和高价值开箱增益，第二刀及枪声不改", () => {
  for (const tier of [1, 2, 3, 4, 5])
    expect(sampleChoice("loot", { tier })?.gain).toBe(1.38);
  expect(sampleChoice("unlock", { tier: 4 })?.key).toBe("unlock-4");
  expect(sampleChoice("unlock", { tier: 5 })?.key).toBe("unlock-5");
  expect(sampleChoice("unlock", { tier: 3 })).toBeUndefined();
  expect(sampleChoice("melee", { swing: 1 })?.gain).toBe(1.2);
  expect(sampleChoice("melee", { swing: 2 })?.gain).toBe(1);
  for (const containerType of ["safe", "weapon", "bed"])
    expect(sampleChoice("open", { containerType })?.gain).toBeCloseTo(1.56);
  expect(sampleChoice("open", { containerType: "box" })?.gain).toBe(1.3);
  expect(sampleChoice("shot", { weaponClass: "rifle" })?.gain).toBe(0.7);
});
it("弹匣实际卸下与重插时间线，缩放至枪械换弹时间并可中断复位", () => {
  const p = (v: number, total = 2) => reloadPose(total * (1 - v), total);
  expect(p(0.01).detached).toBe(0);
  expect(p(0.45).detached).toBe(1);
  expect(p(0.7).detached).toBeGreaterThan(0);
  expect(p(0.9).detached).toBe(0);
  expect(p(0.45, 1)).toEqual(p(0.45, 4));
  expect(reloadPose(0, 2)).toMatchObject({
    active: false,
    hold: 0,
    detached: 0,
  });
});
