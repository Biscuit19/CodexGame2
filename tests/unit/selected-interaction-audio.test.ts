import { it, expect, vi } from "vitest";
import { Raid } from "../../src/raid";
import { db, makeItem } from "../../src/data";
import { newSave } from "../../src/store";
import { sampleChoice } from "../../src/audio-samples";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function raid() {
  const save = newSave();
  save.temporary = true;
  const sound = { play: vi.fn(), stopReload: vi.fn(), stopFood: vi.fn() };
  const r = new Raid(
    save,
    0,
    sound as any,
    () => {},
    () => {},
    () => {},
    42,
  );
  r.enemies = [];
  r.walls = [];
  return { r, save, sound };
}
it("第一刀和第二刀与实际挥砍序号交替，切刀和切枪仅在更换栏位时响", () => {
  const { r, sound } = raid();
  r.selectWeapon("melee");
  expect(sound.play).toHaveBeenCalledWith("switch-melee");
  sound.play.mockClear();
  r.selectWeapon("melee");
  expect(sound.play).not.toHaveBeenCalled();
  r.swingMelee();
  expect(sound.play).toHaveBeenLastCalledWith("melee", 1, { swing: 1 });
  r.meleeCooldown = 0;
  r.swingMelee();
  expect(sound.play).toHaveBeenLastCalledWith("melee", 1, { swing: 2 });
  expect(sampleChoice("melee", { swing: 1 })?.key).toBe("melee-first");
  expect(sampleChoice("melee", { swing: 2 })?.key).toBe("melee-second");
  r.selectWeapon("primary");
  expect(sound.play).toHaveBeenLastCalledWith("switch-weapon");
  expect(sampleChoice("switch-weapon")?.key).toBe("equip-weapon");
});
it("不同容器首次打开使用所选音源，空容器和二次搜索不重复开盖", () => {
  const { r, sound } = raid();
  for (const type of [
    "box",
    "toolbox",
    "cooler",
    "trashcan",
    "basket",
    "litter",
    "cabinet",
    "medical",
    "weapon",
    "bed",
    "safe",
    "corpse",
  ]) {
    const c = {
      x: r.p.x,
      y: r.p.y,
      type,
      name: type,
      items: [],
      revealed: 0,
      open: false,
      locked: false,
      cooldown: 0,
    };
    sound.play.mockClear();
    r.startSearch(c);
    expect(sound.play).toHaveBeenCalledWith("open", 1, { containerType: type });
    expect(sampleChoice("open", { containerType: type })?.key).toBe(
      `open-${type}`,
    );
    sound.play.mockClear();
    r.startSearch(c);
    expect(sound.play).not.toHaveBeenCalledWith("open", 1, {
      containerType: type,
    });
  }
});
it("低级发现继续原音，高级采用指定的交叉候选；成功入包才响", () => {
  for (const tier of [1, 2])
    expect(sampleChoice("loot", { tier })).toBeUndefined();
  for (const tier of [3, 4, 5])
    expect(sampleChoice("loot", { tier })?.key).toBe(`discover-${tier}`);
  const { r, sound, save } = raid();
  const c = {
    x: r.p.x,
    y: r.p.y,
    type: "box",
    name: "纸箱",
    items: [makeItem("f1")],
    revealed: 1,
    open: true,
    locked: false,
    cooldown: 0,
  };
  r.search = c;
  save.equipment.food = makeItem("f2");
  sound.play.mockClear();
  r.take(0);
  expect(sound.play).toHaveBeenLastCalledWith("pack");
  expect(c.items).toHaveLength(0);
  expect(c.open).toBe(true);
  sound.play.mockClear();
  r.take(0);
  expect(sound.play).not.toHaveBeenCalled();
});
it("两种四级食物动作均三秒，进食音效与被打断取消一致", () => {
  for (const id of ["f4", "c4_11"]) {
    expect(db[id].useTime).toBe(3);
    const { r, sound, save } = raid();
    save.equipment.food = makeItem(id);
    r.p.hp = 20;
    r.useFood();
    expect(r.healDuration).toBe(3);
    expect(sound.play).toHaveBeenCalledWith("food", 1, {
      foodId: id,
      seconds: 3,
    });
    r.interrupt(true);
    expect(sound.stopFood).toHaveBeenCalled();
    expect(save.equipment.food?.qty).toBe(1);
  }
});
