import { it, expect, vi } from "vitest";
import { Raid, type Container } from "../../src/raid";
import { newSave } from "../../src/store";
import { sampleChoice } from "../../src/audio-samples";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function raid() {
  const s = newSave();
  s.temporary = true;
  const sound = { play: vi.fn() };
  const r = new Raid(
    s,
    0,
    sound as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  r.walls = [];
  return { r, sound };
}
it("一个保险箱在关闭、答错和冷却后保持题干、答案及选项；另一箱和新一局独立生成", () => {
  const { r } = raid();
  const c: Container = {
    x: r.p.x + 10,
    y: r.p.y,
    name: "保险箱",
    type: "safe",
    items: [],
    revealed: 0,
    locked: true,
    open: false,
    cooldown: 0,
  };
  r.containers = [c];
  r.interact();
  const q = r.puzzle!;
  const snapshot = structuredClone(q);
  expect(c.question).toBe(q);
  r.interrupt();
  r.interact();
  expect(r.puzzle).toBe(q);
  expect(r.puzzle).toEqual(snapshot);
  r.answer(q.answer + 100);
  expect(c.locked).toBe(true);
  expect(c.cooldown).toBe(3);
  r.interact();
  expect(r.puzzle).toBeUndefined();
  c.cooldown = 0;
  r.interact();
  expect(r.puzzle).toBe(q);
  expect(r.puzzle).toEqual(snapshot);
  r.answer(q.answer);
  expect(c.locked).toBe(false);
  expect(c.question).toEqual(snapshot);
  r.interrupt();
  const other = { ...c, question: undefined, locked: true };
  r.containers = [other];
  r.interact();
  expect(other.question).toBeDefined();
  expect(other.question).not.toBe(q);
  const fresh = raid().r;
  const samePosition = {
    ...c,
    question: undefined,
    locked: true,
    x: fresh.p.x + 10,
    y: fresh.p.y,
  };
  fresh.containers = [samePosition];
  fresh.interact();
  expect(samePosition.question).toBeDefined();
  expect(samePosition.question).not.toBe(q);
});
it("玩家受击用PH10，敌人警戒只在四个所选声音中取值，增益按用途分开", () => {
  expect(sampleChoice("hurt")).toMatchObject({ key: "hurt", gain: 0.5 });
  for (let i = 0; i < 4; i++)
    expect(sampleChoice("enemy-alert", { variant: i })).toMatchObject({
      key: `enemy-alert-${i + 1}`,
      gain: 0.65,
    });
  for (const weaponClass of ["smg", "rifle", "sniper", "shotgun"] as const) {
    expect(sampleChoice("shot", { weaponClass, enemy: true })?.gain).toBe(0.35);
    expect(sampleChoice("reload", { weaponClass, enemy: true })?.gain).toBe(
      0.75,
    );
    expect(sampleChoice("shot", { weaponClass })?.gain).toBe(0.7);
  }
  for (const tier of [3, 4, 5])
    expect(sampleChoice("loot", { tier })?.gain).toBe(1.38);
});
it("警戒只在进入战斗时触发一次，持续瞄准不每帧重复；炮塔不叫", () => {
  const { r, sound } = raid();
  const e = r.spawn(r.p.x + 100, r.p.y, 0, 1);
  e.state = "patrol";
  sound.play.mockClear();
  r.engage(e);
  r.engage(e);
  r.engage(e);
  expect(sound.play).toHaveBeenCalledTimes(1);
  expect(sound.play).toHaveBeenCalledWith("enemy-alert");
  e.state = "patrol";
  r.engage(e);
  expect(sound.play).toHaveBeenCalledTimes(2);
  const turret = r.spawn(r.p.x + 300, r.p.y, 0, 1);
  turret.turret = true;
  turret.state = "patrol";
  sound.play.mockClear();
  r.engage(turret);
  expect(sound.play).not.toHaveBeenCalled();
  sound.play.mockClear();
  r.p.hp = 100;
  r.hurtPlayer(1, 1);
  expect(sound.play).toHaveBeenCalledWith("hurt");
});
