import { it, expect, vi } from "vitest";
import { newSave, stashAll } from "../../src/store";
import { makeItem, capacities } from "../../src/data";
import { Raid } from "../../src/raid";
Object.assign(globalThis, {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
});

it("全部放回包含安全箱；容量不足保留原物品且不卸装备", () => {
  const s = newSave();
  s.temporary = true;
  s.pack = [makeItem("c0_0")];
  s.secure = [makeItem("c0_1")];
  const equipment = structuredClone(s.equipment);
  s.stash = Array.from({ length: capacities[s.warehouse] - 1 }, () =>
    makeItem("c0_0"),
  );
  const secure = structuredClone(s.secure);
  expect(stashAll(s)).toEqual({ moved: 1, left: 1 });
  expect(s.secure).toEqual(secure);
  s.stash.pop();
  expect(stashAll(s)).toEqual({ moved: 1, left: 0 });
  expect(s.stash.at(-1)).toEqual(secure[0]);
  expect(s.pack).toEqual([]);
  expect(s.secure).toEqual([]);
  expect(s.equipment).toEqual(equipment);
});

it("Boss射击连招间隔约缩短至1/1.2，普通敌人计时不加速", () => {
  const intervals: number[] = [];
  for (const boss of [false, true]) {
    const s = newSave();
    s.temporary = true;
    const r = new Raid(
      s,
      0,
      { play: () => {} } as any,
      () => {},
      () => {},
      () => {},
      42,
    );
    const e = boss
      ? r.enemies.find((e) => e.boss)!
      : r.enemies.find((e) => !e.boss)!;
    e.state = "combat";
    e.tacticCool = 10;
    e.mag = 50;
    e.maneuver = {
      kind: "boss-fan",
      stage: "active",
      time: 0.2,
      shots: 3,
      angle: 0,
      x: 4400,
      y: 2800,
    };
    vi.spyOn(r, "enemyCanFire").mockReturnValue(true);
    const shot = vi.spyOn(r, "tacticShot").mockImplementation(() => {});
    let elapsed = 0;
    while (!shot.mock.calls.length && elapsed < 1) {
      r.updateVillageTactics(e, 0.001, true);
      elapsed += 0.001;
    }
    intervals.push(elapsed);
    expect(e.tacticCool).toBeCloseTo(9.8, 2);
  }
  expect(intervals[0]).toBeCloseTo(0.2, 2);
  expect(intervals[0] / intervals[1]).toBeCloseTo(1.2, 2);
});
