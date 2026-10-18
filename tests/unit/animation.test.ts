import { describe, it, expect } from "vitest";
import { updateBlink } from "../../src/player-cat";

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
