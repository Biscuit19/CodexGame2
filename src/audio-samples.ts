import type { WeaponClass } from "./data";
import smg from "./assets/audio/shot-smg.flac?url";
import rifle from "./assets/audio/shot-rifle.flac?url";
import sniper from "./assets/audio/shot-sniper.flac?url";
import shotgun from "./assets/audio/shot-shotgun.flac?url";
import reloadSmg from "./assets/audio/reload-smg.flac?url";
import reloadRifle from "./assets/audio/reload-rifle.flac?url";
import reloadSniper from "./assets/audio/reload-sniper.flac?url";
import reloadShotgun from "./assets/audio/reload-shotgun.flac?url";
import equipWeapon from "./assets/audio/equip-weapon.flac?url";
import equipGear from "./assets/audio/equip-gear.flac?url";
import roll from "./assets/audio/roll.flac?url";
import melee from "./assets/audio/melee.ogg?url";
import foodFish from "./assets/audio/food-fish.flac?url";
import foodPaste from "./assets/audio/food-paste.flac?url";
import foodIce from "./assets/audio/food-ice.flac?url";
import foodWater from "./assets/audio/food-water.flac?url";
import foodMilk from "./assets/audio/food-milk.flac?url";
import foodCan from "./assets/audio/food-can.flac?url";
import foodFries from "./assets/audio/food-fries.flac?url";
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
  "food-fish": foodFish,
  "food-paste": foodPaste,
  "food-ice": foodIce,
  "food-water": foodWater,
  "food-milk": foodMilk,
  "food-can": foodCan,
  "food-fries": foodFries,
};
export type SampleKey = keyof typeof sampleBank;
export const foodSamples: Partial<Record<string, SampleKey>> = {
  f1: "food-fish",
  f2: "food-paste",
  c3_1: "food-ice",
  c1_9: "food-water",
  c1_1: "food-milk",
  f3: "food-can",
  c1_10: "food-fries",
  c4_8: "food-fries",
};
export type SoundOptions = {
  weaponClass?: WeaponClass;
  seconds?: number;
  enemy?: boolean;
  foodId?: string;
};
export function sampleChoice(name: string, options: SoundOptions = {}) {
  const kind = options.weaponClass ?? "rifle";
  const key =
    name === "shot" || name === "enemy"
      ? `shot-${kind}`
      : name === "food"
        ? foodSamples[options.foodId ?? ""]
        : name === "reload"
          ? `reload-${kind}`
          : name;
  if (!key || !(key in sampleBank)) return;
  return {
    key: key as SampleKey,
    gain: options.enemy || name === "enemy" ? 0.75 : 1,
    seconds: name === "reload" || name === "food" ? options.seconds : undefined,
    reload: name === "reload" && !options.enemy,
    food: name === "food",
  };
}
