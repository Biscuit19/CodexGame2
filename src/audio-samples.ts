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

import foodFish from "./assets/audio/food-fish.flac?url";
import foodPaste from "./assets/audio/food-paste.flac?url";
import foodIce from "./assets/audio/food-ice.flac?url";
import foodWater from "./assets/audio/food-water.flac?url";
import foodMilk from "./assets/audio/food-milk.flac?url";
import foodCan from "./assets/audio/food-can.flac?url";
import foodFries from "./assets/audio/food-fries.flac?url";
import meleeFirst from "./assets/audio/melee-first.flac?url";
import meleeSecond from "./assets/audio/melee-second.flac?url";
import switchMelee from "./assets/audio/switch-melee.flac?url";
import foodTier4 from "./assets/audio/food-tier4.flac?url";
import openBox from "./assets/audio/open-box.flac?url";
import openToolbox from "./assets/audio/open-toolbox.flac?url";
import openCooler from "./assets/audio/open-cooler.flac?url";
import openTrashcan from "./assets/audio/open-trashcan.flac?url";
import openBasket from "./assets/audio/open-basket.flac?url";
import openLitter from "./assets/audio/open-litter.flac?url";
import openCabinet from "./assets/audio/open-cabinet.flac?url";
import openMedical from "./assets/audio/open-medical.flac?url";
import openWeapon from "./assets/audio/open-weapon.flac?url";
import openBed from "./assets/audio/open-bed.flac?url";
import openSafe from "./assets/audio/open-safe.flac?url";
import openCorpse from "./assets/audio/open-corpse.flac?url";
import discover3 from "./assets/audio/discover-3.flac?url";
import discover4 from "./assets/audio/discover-4.flac?url";
import discover5 from "./assets/audio/discover-5.flac?url";
import pack from "./assets/audio/pack.flac?url";
import hurt from "./assets/audio/hurt.flac?url";
import enemyAlert1 from "./assets/audio/enemy-alert-1.flac?url";
import enemyAlert2 from "./assets/audio/enemy-alert-2.flac?url";
import enemyAlert3 from "./assets/audio/enemy-alert-3.flac?url";
import enemyAlert4 from "./assets/audio/enemy-alert-4.flac?url";
import discover1 from "./assets/audio/discover-1.flac?url";
import discover2 from "./assets/audio/discover-2.flac?url";
import unlock4 from "./assets/audio/unlock-4.flac?url";
import unlock5 from "./assets/audio/unlock-5.flac?url";
export const sampleBank = {
  "discover-1": discover1,
  "discover-2": discover2,
  "unlock-4": unlock4,
  "unlock-5": unlock5,
  hurt,
  "enemy-alert-1": enemyAlert1,
  "enemy-alert-2": enemyAlert2,
  "enemy-alert-3": enemyAlert3,
  "enemy-alert-4": enemyAlert4,
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
  "melee-first": meleeFirst,
  "melee-second": meleeSecond,
  "switch-melee": switchMelee,
  "food-tier4": foodTier4,
  "open-box": openBox,
  "open-toolbox": openToolbox,
  "open-cooler": openCooler,
  "open-trashcan": openTrashcan,
  "open-basket": openBasket,
  "open-litter": openLitter,
  "open-cabinet": openCabinet,
  "open-medical": openMedical,
  "open-weapon": openWeapon,
  "open-bed": openBed,
  "open-safe": openSafe,
  "open-corpse": openCorpse,
  "discover-3": discover3,
  "discover-4": discover4,
  "discover-5": discover5,
  pack: pack,
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
  f4: "food-tier4",
  c4_11: "food-tier4",
};
export type SoundOptions = {
  weaponClass?: WeaponClass;
  seconds?: number;
  enemy?: boolean;
  foodId?: string;
  containerType?: string;
  swing?: number;
  tier?: number;
  variant?: number;
};
export function sampleChoice(name: string, options: SoundOptions = {}) {
  const kind = options.weaponClass ?? "rifle";
  const alertVariant =
    name === "enemy-alert"
      ? Math.floor(options.variant ?? Math.random() * 4) % 4
      : 0;
  const key =
    name === "enemy-alert"
      ? `enemy-alert-${alertVariant + 1}`
      : name === "shot" || name === "enemy"
        ? `shot-${kind}`
        : name === "food"
          ? foodSamples[options.foodId ?? ""]
          : name === "reload"
            ? `reload-${kind}`
            : name === "melee"
              ? (options.swing ?? 1) % 2 === 1
                ? "melee-first"
                : "melee-second"
              : name === "switch-weapon"
                ? "equip-weapon"
                : name === "open"
                  ? `open-${options.containerType}`
                  : name === "loot"
                    ? `discover-${Math.max(1, Math.min(5, options.tier ?? 1))}`
                    : name === "unlock"
                      ? `unlock-${options.tier}`
                      : name;
  if (!key || !(key in sampleBank)) return;
  return {
    key: key as SampleKey,
    gain:
      (name === "shot" || name === "enemy") &&
      (options.enemy || name === "enemy")
        ? 0.35
        : name === "shot" || name === "enemy"
          ? 0.7
          : name === "loot" || name === "unlock"
            ? 1.38
            : name === "melee" && (options.swing ?? 1) % 2 === 1
              ? 1.2
              : name === "open"
                ? 1.3 *
                  (["safe", "weapon", "bed"].includes(
                    options.containerType ?? "",
                  )
                    ? 1.2
                    : 1)
                : name === "hurt"
                  ? 0.5
                  : name === "enemy-alert"
                    ? 0.65
                    : options.enemy
                      ? 0.75
                      : 1,
    seconds: name === "reload" || name === "food" ? options.seconds : undefined,
    reload: name === "reload" && !options.enemy,
    food: name === "food",
  };
}
