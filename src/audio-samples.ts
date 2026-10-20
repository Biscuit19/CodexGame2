import type { WeaponClass } from "./data";
import smg from "./assets/audio/shot-smg.ogg?url";
import rifle from "./assets/audio/shot-rifle.ogg?url";
import sniper from "./assets/audio/shot-sniper.ogg?url";
import shotgun from "./assets/audio/shot-shotgun.ogg?url";
import reloadSmg from "./assets/audio/reload-smg.ogg?url";
import reloadRifle from "./assets/audio/reload-rifle.ogg?url";
import reloadSniper from "./assets/audio/reload-sniper.ogg?url";
import reloadShotgun from "./assets/audio/reload-shotgun.ogg?url";
import equipWeapon from "./assets/audio/equip-weapon.ogg?url";
import equipGear from "./assets/audio/equip-gear.ogg?url";
import roll from "./assets/audio/roll.ogg?url";
import melee from "./assets/audio/melee.ogg?url";
export const sampleBank = {
  "shot-smg": smg,
  "shot-rifle": rifle,
  "shot-sniper": sniper,
  "shot-shotgun": shotgun,
  "reload-smg": reloadSmg,
  "reload-rifle": reloadRifle,
  "reload-sniper": reloadSniper,
  "reload-shotgun": reloadShotgun,
  "equip-weapon": equipWeapon,
  "equip-gear": equipGear,
  roll,
  melee,
};
export type SampleKey = keyof typeof sampleBank;
export type SoundOptions = {
  weaponClass?: WeaponClass;
  seconds?: number;
  enemy?: boolean;
};
export function sampleChoice(name: string, options: SoundOptions = {}) {
  const kind = options.weaponClass ?? "rifle";
  const key =
    name === "shot" || name === "enemy"
      ? `shot-${kind}`
      : name === "reload"
        ? `reload-${kind}`
        : name;
  if (!(key in sampleBank)) return;
  return {
    key: key as SampleKey,
    gain: options.enemy || name === "enemy" ? 0.75 : 1,
    seconds: name === "reload" ? options.seconds : undefined,
    reload: name === "reload" && !options.enemy,
  };
}
