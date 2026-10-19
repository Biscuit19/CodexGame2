import { describe, it, expect } from "vitest";
import { updateBlink } from "../../src/player-cat";
import { tailRootMotion, tailTipDirection } from "../../src/player-tail";

describe("眨眼不跳过闭眼画面", () => {
  it("不规则长帧跨过闭眼时刻仍保留完整闭眼关键帧", () => {
    const state = { blinkAt: 0.5, blinkElapsed: 0.09, blinkLast: 1, phase: 0 };
    expect(updateBlink(state, 1.06)).toBe(0.055);
    updateBlink(state, 1.5);
    expect(updateBlink(state, 2)).toBe(1);
    expect(state.blinkAt).toBeGreaterThan(2);
  });
  for (const frame of [1 / 60, 0.5]) {
    it(`${frame < 0.1 ? "正常帧率" : "每秒两帧"}仍能完整闭眼、重新睁眼并再次眨眼`, () => {
      const state = { blinkAt: 0, blinkElapsed: -1, blinkLast: 0, phase: 0 };
      const samples = Array.from({ length: Math.ceil(14 / frame) }, (_, i) =>
        updateBlink(state, i * frame),
      );
      expect(samples.every((v) => v >= 0.055 && v <= 1)).toBe(true);
      const closed = samples.findIndex((v) => v < 0.15);
      expect(closed).toBeGreaterThan(0);
      const open = samples.findIndex((v, i) => i > closed && v === 1);
      expect(open).toBeGreaterThan(closed);
      expect(samples.slice(open + 1).some((v) => v < 0.15)).toBe(true);
    });
  }
});

describe("尾根前后摆动与尾尖随机方向", () => {
  it("尾根保留左右大幅扫动，同时有轻微连续的前后摆动", () => {
    const samples = Array.from({ length: 720 }, (_, i) =>
      tailRootMotion(i / 60, 0.8),
    );
    expect(Math.min(...samples.map((p) => p.x))).toBeLessThan(-0.1);
    expect(Math.max(...samples.map((p) => p.x))).toBeGreaterThan(0.1);
    expect(Math.min(...samples.map((p) => p.y))).toBeLessThan(-1.2);
    expect(Math.max(...samples.map((p) => p.y))).toBeGreaterThan(1.2);
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i].x - samples[i - 1].x)).toBeLessThan(0.003);
      expect(Math.abs(samples[i].y - samples[i - 1].y)).toBeLessThan(0.045);
    }
  });
  it("随机目标覆盖完整360度，每只猫独立且重新采样可复现", () => {
    const bins = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const target = tailTipDirection(i * 2.6, 0.4);
      expect(Math.hypot(target.x, target.z)).toBeCloseTo(1);
      bins.add(
        Math.floor((Math.atan2(target.z, target.x) + Math.PI) / (Math.PI / 4)) %
          8,
      );
      expect(target).toEqual(tailTipDirection(i * 2.6, 0.4));
    }
    expect(bins.size).toBe(8);
    expect(tailTipDirection(5, 0.3)).not.toEqual(tailTipDirection(5, 2.1));
  });
  it("目标切换与跨过零度时平滑过渡，没有瞬间跳向或角度绕远路", () => {
    for (let i = 1; i < 60 * 60; i++) {
      const a = tailTipDirection((i - 1) / 60, 1.1),
        b = tailTipDirection(i / 60, 1.1);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.04);
    }
    for (let i = 1; i < 40; i++) {
      const t = i * 2.6 - 1.1 * 0.73;
      const a = tailTipDirection(t - 1e-5, 1.1),
        b = tailTipDirection(t + 1e-5, 1.1);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1e-6);
    }
  });
});
