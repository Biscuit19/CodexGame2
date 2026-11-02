import { describe, it, expect } from "vitest";
import { Raid } from "../../src/raid";
import { newSave } from "../../src/store";
import { villageBuildings, inBuilding, villagePoint } from "../../src/village";
import { notificationPresentation } from "../../src/notifications";
Object.assign(globalThis, {
  window: {},
  localStorage: { getItem: () => null, setItem: () => {} },
});
function raid(seed = 42) {
  const s = newSave();
  s.temporary = true;
  return new Raid(
    s,
    0,
    { play: () => {} } as any,
    () => {},
    () => {},
    () => {},
    seed,
  );
}
describe("地图资源、撤离与统一提示", () => {
  it("诊所保险箱可接近且在室内；三个区域新增高级容器、Boss医疗补给到位", () => {
    for (let seed = 0; seed < 16; seed++) {
      const r = raid(seed),
        clinic = villageBuildings.find((b) => b.id === "clinic")!;
      const safe = r.containers.find(
        (c) => c.region === "clinic" && c.type === "safe",
      )!;
      expect(safe).toBeTruthy();
      expect(safe.locked).toBe(true);
      expect(inBuilding(clinic, safe.x, safe.y)).toBe(true);
      expect(r.blocked(safe.x, safe.y, 20)).toBe(false);
      expect(
        r.containers.filter((c) => c.region === "boss" && c.type === "medical"),
      ).toHaveLength(2);
      for (const region of ["hunter", "home"])
        expect(
          r.containers.filter((c) => c.region === region && c.type === "bed"),
        ).toHaveLength(1);
      expect(
        r.containers.filter((c) => c.region === "barn" && c.type === "weapon")
          .length,
      ).toBeGreaterThanOrEqual(2);
      const ordinary = [
        "box",
        "basket",
        "toolbox",
        "cooler",
        "trashcan",
        "litter",
      ].map((t) => r.containers.filter((c) => c.type === t).length);
      expect(Math.max(...ordinary) - Math.min(...ordinary)).toBeLessThanOrEqual(
        4,
      );
    }
  });
  it("Boss撤离在主屋上方、新增农田东侧撤离常驻免费，落点无实体且未加击杀条件", () => {
    const r = raid(),
      boss = villageBuildings.find((b) => b.id === "boss")!;
    expect(r.exits).toHaveLength(4);
    const b = r.exits.find((e) => e.name === "农庄内院 B")!;
    expect(Math.abs(b.x - boss.x)).toBeLessThan(90);
    expect(b.y).toBeLessThan(boss.y - 250);
    expect(b.paid).toBe(false);
    const east = r.exits.find((e) => e.name === "麦田东侧 C")!,
      p = villagePoint(2230, 870);
    expect(east).toMatchObject({ active: true, paid: false });
    expect(Math.hypot(east.x - p.x, east.y - p.y)).toBeLessThan(90);
    for (const e of [b, east]) expect(r.blocked(e.x, e.y, 24)).toBe(false);
  });
  it("危险提示红色，缺弹短句，Boss奖励与撤离使用独立主题", () => {
    expect(
      notificationPresentation("没有对应等级的备弹 · 在背包切换弹药"),
    ).toEqual({ text: "无备弹 · 切换弹药", tone: "danger" });
    expect(
      notificationPresentation("最后 5 分钟 · 立即规划撤离路线").tone,
    ).toBe("danger");
    expect(
      notificationPresentation("击败 铁腮 · 成功撤离以保存进度").tone,
    ).toBe("reward");
    expect(notificationPresentation("撤离已启动 · 留在圈内 3 秒").tone).toBe(
      "success",
    );
  });
});
