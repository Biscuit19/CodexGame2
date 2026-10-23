import { it, expect, vi } from "vitest";
import { defaultBalance, parseBalance } from "../../src/audio-balance";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { sampleChoice } from "../../src/audio-samples";
it("导出音量以稳定编号往返；拒绝过期、非有限和负增益", () => {
  const profile = structuredClone(defaultBalance);
  profile.samples.buy = 0.8;
  profile.cues.click = 0.6;
  profile.music.BG5 = 1.1;
  expect(parseBalance(JSON.parse(JSON.stringify(profile)))).toEqual(profile);
  for (const change of [
    { version: 2 },
    { revision: "old" },
    { enemyShots: NaN },
    { buses: { ...profile.buses, music: -1 } },
    { samples: { buy: Infinity } },
  ])
    expect(() => parseBalance({ ...profile, ...change })).toThrow();
  expect(defaultBalance.buses.music).toBeCloseTo(0.35 * 0.64);
  expect(sampleChoice("open", { containerType: "safe" })?.gain).toBeCloseTo(
    1.872,
  );
});
it("丢弃成功才播放DP1，不生成新战利品盒", () => {
  Object.assign(globalThis, {
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {},
  });
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
  const containers = r.containers.length;
  expect(r.dropItem("nonexistent")).toBe(false);
  expect(sound.play).not.toHaveBeenCalled();
  expect(r.dropItem(s.pack[0].uid)).toBe(true);
  expect(sound.play).toHaveBeenCalledExactlyOnceWith("discard");
  expect(r.containers.length).toBe(containers);
});

it("解锁音解码等待期间也保护提示；离开本局后不补播过期音效", async () => {
  const { Sound } = await import("../../src/audio");
  const { defaults } = await import("../../src/store");
  const s = new Sound({ ...defaults });
  const create = vi.fn();
  s.ctx = { currentTime: 0, createBufferSource: create } as any;
  let release!: (b: any) => void;
  const pending = new Promise((resolve) => (release = resolve));
  (s as any).loadSample = () => pending;
  s.play("unlock", 4);
  await Promise.resolve();
  expect(s.unlockRemaining).toBe(Infinity);
  s.stopSamples();
  release({ duration: 5 });
  await Promise.resolve();
  await Promise.resolve();
  expect(create).not.toHaveBeenCalled();
  expect(s.unlockRemaining).toBe(0);
});
