import type { WeaponClass } from "./data";
import smg from "./assets/audio/shot-smg.flac?url";
import rifle from "./assets/audio/shot-rifle.flac?url";
import sniper from "./assets/audio/shot-sniper.flac?url";
import shotgun from "./assets/audio/shot-shotgun.flac?url";
import reloadSmg from "./assets/audio/reload-smg.flac?url";
import reloadRifle from "./assets/audio/reload-rifle.flac?url";
import reloadSniper from "./assets/audio/reload-sniper.flac?url";
import reloadShotgun from "./assets/audio/reload-shotgun.flac?url";
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
