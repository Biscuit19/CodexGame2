import { describe, it, expect } from "vitest";
import { updateBlink, tailMotion } from "../../src/player-cat";

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

describe("尾根与尾尖独立而连续地摆动", () => {
  it("尾尖三轴有明显正反摆动，且不会只是复制尾根朝向", () => {
    const roots = [],
      tips = [];
    for (let i = 0; i < 720; i++) {
      roots.push(tailMotion(i / 60, 0.8, 0));
      tips.push(tailMotion(i / 60, 0.8, 5));
    }
    for (const axis of ["x", "y", "z"] as const) {
      expect(Math.min(...tips.map((p) => p[axis]))).toBeLessThan(-0.05);
      expect(Math.max(...tips.map((p) => p[axis]))).toBeGreaterThan(0.05);
    }
    expect(tips.some((p, i) => p.y * roots[i].y < -0.02)).toBe(true);
    expect(tailMotion(2, 0.3, 5)).not.toEqual(tailMotion(2, 1.7, 5));
  });
  it("每段骨骼连续变化，没有逐帧随机抽搐或过度扭转", () => {
    for (let joint = 0; joint < 6; joint++) {
      for (let i = 1; i < 600; i++) {
        const previous = tailMotion((i - 1) / 60, 1.1, joint);
        const next = tailMotion(i / 60, 1.1, joint);
        for (const axis of ["x", "y", "z"] as const) {
          expect(Math.abs(next[axis])).toBeLessThan(0.9);
          expect(Math.abs(next[axis] - previous[axis])).toBeLessThan(0.04);
        }
      }
    }
  });
});
