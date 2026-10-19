import { describe, expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { movementFrame, rollAxis } from "../../src/locomotion";

const rad = (degrees: number) => (degrees * Math.PI) / 180;
describe("相对瞄准方向的移动与翻滚", () => {
  it("45度以内前进、135至225度后退，其余左右侧移，包含所有边界", () => {
    for (const aim of [0, 37, 90, 179, 270, 359]) {
      for (const [offset, kind] of [
        [-45, "forward"],
        [0, "forward"],
        [45, "forward"],
        [45.01, "right"],
        [90, "right"],
        [134.99, "right"],
        [135, "backward"],
        [180, "backward"],
        [225, "backward"],
        [225.01, "left"],
        [270, "left"],
        [314.99, "left"],
        [315, "forward"],
      ] as const) {
        expect(
          movementFrame(rad(aim), rad(aim + offset)).kind,
          `${aim}/${offset}`,
        ).toBe(kind);
      }
    }
  });
  it("跨越零度和多圈时方向一致，后退投影反向、两侧投影互为相反数", () => {
    expect(movementFrame(rad(350), rad(10)).kind).toBe("forward");
    expect(movementFrame(rad(10), rad(350)).kind).toBe("forward");
    for (const offset of [0, 60, 90, 180, 270]) {
      const a = movementFrame(rad(25), rad(25 + offset));
      const b = movementFrame(rad(25 + 720), rad(25 + offset - 720));
      expect(a.kind).toBe(b.kind);
      expect(a.forward).toBeCloseTo(b.forward);
      expect(a.side).toBeCloseTo(b.side);
    }
    expect(movementFrame(0, Math.PI).forward).toBeCloseTo(-1);
    expect(movementFrame(0, Math.PI / 2).side).toBeCloseTo(-1);
    expect(movementFrame(0, -Math.PI / 2).side).toBeCloseTo(1);
  });
  it("任意瞄准方向的八向翻滚保持朝向，倾倒方向与实际移动一致且无竖轴自转", () => {
    for (const aim of [0, 0.4, Math.PI / 2, Math.PI, -2.8]) {
      for (let n = 0; n < 8; n++) {
        const direction = (n * Math.PI) / 4;
        const axis = rollAxis(aim, direction);
        const localAxis = new Vector3(axis.x, axis.y, axis.z);
        expect(localAxis.length()).toBeCloseTo(1);
        expect(axis.y).toBe(0);
        const top = new Vector3(0, 1, 0)
          .applyQuaternion(new Quaternion().setFromAxisAngle(localAxis, 0.2))
          .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2 - aim);
        expect(Math.atan2(top.z, top.x)).toBeCloseTo(
          Math.atan2(Math.sin(direction), Math.cos(direction)),
        );
      }
    }
  });
});
