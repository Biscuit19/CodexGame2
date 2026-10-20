import { describe, it, expect, vi } from "vitest";
import {
  weaponSpreadDegrees,
  weapons,
  melee,
  MELEE_SWING_SECONDS,
  makeItem,
} from "../../src/data";
import { sampleChoice } from "../../src/audio-samples";
import { newSave } from "../../src/store";
import { Raid } from "../../src/raid";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
  window: {},
});
function raid() {
  const s = newSave();
  s.temporary = true;
  const sound = { play: vi.fn(), stopReload: vi.fn() };
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
  return { s, r, sound };
}
describe("按枪型的音效与可读参数", () => {
  it("角度是完整左右散布扇区，包含霰弹抖动，狙击为零；近战攻速等于真实冷却", () => {
    for (const w of weapons) {
      const limit = (w.spread ?? 0) * ((w.pellets ?? 1) > 1 ? 1.075 : 1);
      expect(weaponSpreadDegrees(w)).toBeCloseTo((limit * 360) / Math.PI, 0);
    }
    expect(weaponSpreadDegrees(weapons[0])).toBe(13.8);
    expect(weaponSpreadDegrees(weapons[9])).toBe(0);
    expect(weaponSpreadDegrees(weapons[16])).toBe(20.9);
    expect(60 / melee.rpm!).toBeCloseTo(MELEE_SWING_SECONDS);
  });
  it("四类枪声与换弹独立，敌人使用相同素材但音量恰为75%", () => {
    for (const weaponClass of ["smg", "rifle", "sniper", "shotgun"] as const) {
      const player = sampleChoice("shot", { weaponClass })!,
        enemy = sampleChoice("shot", { weaponClass, enemy: true })!;
      expect(player.key).toBe(`shot-${weaponClass}`);
      expect(enemy.key).toBe(player.key);
      expect(enemy.gain / player.gain).toBe(0.75);
      expect(
        sampleChoice("reload", { weaponClass, seconds: 1.5 }),
      ).toMatchObject({
        key: `reload-${weaponClass}`,
        seconds: 1.5,
        reload: true,
      });
    }
  });
  it("实际射击、换弹与敌人战斗传递正确枪型与真实换弹时间", () => {
    for (const index of [0, 3, 9, 16]) {
      const { s, r, sound } = raid(),
        w = weapons[index];
      s.equipment.primary = makeItem(w.id);
      r.magazines[s.equipment.primary.uid] = 1;
      r.magazineTiers[s.equipment.primary.uid] = 1;
      r.shoot();
      expect(sound.play).toHaveBeenCalledWith("shot", 1, {
        weaponClass: w.weaponClass,
      });
      r.loadMagazine();
      expect(sound.play).toHaveBeenCalledWith("reload", 1, {
        weaponClass: w.weaponClass,
        seconds: w.reload,
      });
      r.selectWeapon("melee");
      expect(sound.stopReload).toHaveBeenCalled();
      const e = r.spawn(r.p.x + 150, r.p.y, 0, 1);
      e.weapon = index;
      e.mag = 1;
      e.cool = 0;
      e.skillCool = 100;
      e.telegraph = undefined;
      e.reload = 0;
      r.updateEnemy(e, 0.001);
      expect(sound.play).toHaveBeenCalledWith("shot", 1, {
        weaponClass: w.weaponClass,
        enemy: true,
      });
      e.mag = 0;
      e.cool = 0;
      e.reload = 0;
      r.updateEnemy(e, 0.001);
      expect(sound.play).toHaveBeenCalledWith("reload", 1, {
        weaponClass: w.weaponClass,
        seconds: w.reload,
        enemy: true,
      });
    }
  });
  it("装备武器和护具使用各自音源，翻滚和近战不再共用音效", () => {
    const { r, s, sound } = raid();
    s.pack = [makeItem("w3"), makeItem("h2")];
    expect(r.equipLoot(s.pack[0].uid)).toBe(true);
    expect(sound.play).toHaveBeenCalledWith("equip-weapon");
    expect(r.equipLoot(s.pack[0].uid)).toBe(true);
    expect(sound.play).toHaveBeenCalledWith("equip-gear");
    r.roll(1, 0);
    expect(sound.play).toHaveBeenCalledWith("roll");
    r.p.roll = 0;
    r.selectWeapon("melee");
    r.swingMelee();
    expect(sound.play).toHaveBeenCalledWith("melee");
  });
});
