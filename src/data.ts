import { applyItemTuning, weightedItem } from "./game-tuning-runtime";
import { collectibleRows, foodHomageRows } from "./collectibles";
export type Kind =
  | "weapon"
  | "armor"
  | "helmet"
  | "bag"
  | "ammo"
  | "food"
  | "collectible"
  | "melee";
export type WeaponClass = "smg" | "rifle" | "sniper" | "shotgun";
export const weaponClassNames: Record<WeaponClass, string> = {
  smg: "冲锋枪",
  rifle: "步枪",
  sniper: "狙击枪",
  shotgun: "霰弹枪",
};
/** Full angular cone, including the existing shotgun pellet jitter (+/-7.5%). */
export function weaponSpreadDegrees(def: ItemDef) {
  return Number(
    (
      (((def.spread ?? 0) * 360) / Math.PI) *
      ((def.pellets ?? 1) > 1 ? 1.075 : 1)
    ).toFixed(1),
  );
}
export interface ItemDef {
  id: string;
  name: string;
  kind: Kind;
  tier: number;
  price: number;
  buyPrice?: number;
  shopLimit?: number;
  lootWeight?: number;
  icon: string;
  desc: string;
  damage?: number;
  mag?: number;
  rpm?: number;
  range?: number;
  spread?: number;
  reload?: number;
  capacity?: number;
  heal?: number;
  healOverTime?: number;
  healSeconds?: number;
  useTime?: number;
  durability?: number;
  unlock?: number;
  weaponClass?: WeaponClass;
  pellets?: number;
}
export interface Item {
  uid: string;
  id: string;
  qty: number;
  /** Quantity carried into this raid; absent means newly acquired. Cleared at settlement. */
  raidBrought?: number;
  durability?: number;
  maxDurability?: number;
  loaded?: { tier: number; count: number; raidBrought?: number };
}
export function takeQuantity(item: Item, quantity: number): Item {
  const qty = Math.min(quantity, item.qty),
    brought = Math.min(item.raidBrought ?? 0, qty),
    part = { ...item, qty };
  if (brought) part.raidBrought = brought;
  else delete part.raidBrought;
  item.qty -= qty;
  const remaining = (item.raidBrought ?? 0) - brought;
  if (remaining) item.raidBrought = remaining;
  else delete item.raidBrought;
  return part;
}
export const AMMO_STACK = 120,
  FOOD_STACK = 5,
  BASE_PACK = 20,
  EXTRACT_SECONDS = 3;
export let MELEE_SWING_SECONDS = 0.45;
export const PREFLIGHT_AMMO = 120,
  PREFLIGHT_FOOD = 1,
  PREFLIGHT_WEAPONS = 1;
export const SALE_RATIO = 0.65,
  PLAYER_MAX_HP = 100,
  RAID_SECONDS = 900;
export const MOVEMENT = {
  maxStamina: 100,
  runSpeed: 220,
  knifeSpeed: 270,
  exhaustedSpeed: 140,
  drainPerSecond: 100 / 30,
  rollCost: 10,
  recoveryPerSecond: 24,
  recoverThreshold: 25,
};
export const melee: ItemDef = {
  id: "k0",
  name: "猫爪短刀",
  kind: "melee",
  tier: 1,
  price: 0,
  icon: "sword",
  desc: "不需要子弹，只需要一点勇气，以及对方刚好正在换弹。",
  damage: 48,
  range: 85,
  rpm: 60 / MELEE_SWING_SECONDS,
};
export const rarity = ["", "常见", "优良", "珍贵", "稀世", "传说"];
export const colors = [
  "",
  "#a6b3aa",
  "#8ac787",
  "#72bce2",
  "#bf9ae9",
  "#edbd69",
];
export const collectibleColors = [
  "",
  "#f8faf3",
  "#9cf2a4",
  "#81ceff",
  "#ffe07a",
  "#ff7d79",
];
export const capacities = [60, 80, 120, 200, 450],
  warehouseCosts = [0, 8000, 25000, 70000, 160000];
export const safeCap = [1, 2, 4, 6],
  safePrice = [0, 12000, 45000, 120000],
  safeNames = ["旧铁盒", "双鱼盒", "四爪保险箱", "六命保险箱"];
// Preserve legacy IDs and never shrink their magazines: existing saves keep all loaded rounds.
const weaponRows: [
  string,
  WeaponClass,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number?,
][] = [
  ["卷尾猫兹", "smg", 14, 30, 720, 360, 0.12, 1.5, 900, 1],
  ["折耳MP5", "smg", 15, 40, 800, 390, 0.09, 1.7, 2100, 2],
  ["罐头汤姆逊", "smg", 18, 50, 600, 350, 0.14, 2.4, 3200, 2],
  ["三尾47", "rifle", 22, 30, 600, 550, 0.045, 2, 2800, 2],
  ["爪钩M4", "rifle", 20, 30, 680, 580, 0.028, 1.8, 5500, 3],
  ["虎斑95", "rifle", 24, 30, 650, 570, 0.04, 2.2, 6200, 3],
  ["长须M16", "rifle", 22, 30, 650, 560, 0.032, 1.9, 4200, 2],
  ["猫靴SCAR", "rifle", 31, 20, 480, 650, 0.035, 2.3, 10500, 4],
  ["鱼脊G36", "rifle", 24, 30, 720, 620, 0.027, 2.1, 8500, 3],
  ["棉云AWM", "sniper", 68, 5, 45, 1000, 0, 2.8, 7000, 3],
  ["鱼叉SVD", "sniper", 50, 10, 150, 900, 0, 2.4, 12000, 4],
  ["巨爪巴雷特", "sniper", 100, 5, 28, 1200, 0, 3, 24000, 5],
  ["鱼骨P90", "smg", 15, 50, 900, 420, 0.11, 2.3, 5800, 3],
  ["折爪维克托", "smg", 16, 33, 1100, 340, 0.15, 1.9, 9500, 4],
  ["午睡AUG", "rifle", 22, 30, 650, 600, 0.024, 2.1, 7200, 3],
  ["折纸法喵斯", "rifle", 21, 25, 950, 580, 0.04, 2.5, 11500, 4],
  ["抓板870", "shotgun", 11, 6, 70, 230, 0.17, 2.8, 1600, 1, 7],
  ["虎牙686", "shotgun", 13, 2, 260, 210, 0.2, 2.4, 3300, 2, 8],
  ["铃铛1887", "shotgun", 14, 5, 75, 260, 0.15, 2.9, 6500, 3, 8],
  ["炸毛AA12", "shotgun", 10, 20, 300, 240, 0.23, 3.2, 21000, 5, 8],
];
export const weapons: ItemDef[] = weaponRows.map((r, i) => ({
  id: `w${i}`,
  name: r[0] as string,
  kind: "weapon",
  icon: r[1],
  weaponClass: r[1],
  damage: r[2],
  mag: r[3],
  rpm: r[4],
  range: r[5],
  spread: r[6],
  reload: r[7],
  price: r[8],
  tier: r[9],
  pellets: r[10] ?? 1,
  durability: [100, 125, 150, 185, 220][r[9] - 1],
  unlock: Math.min(3, Math.max(0, r[9] - 2)),
  desc: [
    "尾巴卷得像弹簧，子弹倒是一发也不肯弹回来。",
    "耳朵折起来听不见劝，扳机扣下去停不住爪。",
    "黑帮大佬的爵士乐器，鼓里装的不是金枪鱼。",
    "三条尾巴一起摇，后坐力也只好跟着讲道理。",
    "钩住的不是敌人，是铲屎官最后的装备预算。",
    "国产虎斑很能打，唯一的死角是肚皮。",
    "枪管长，胡须更长，拐弯时记得两样都收好。",
    "战术大靴子穿上身，敌人看完只想退货。",
    "鱼骨卡在枪上，不在喉咙里，火力才顺畅。",
    "看起来像一朵云，落下来的却不是小雨。",
    "鱼叉用于捕鱼，这把主要负责让敌猫摸不着鱼。",
    "爪子越大口径越大，开枪前建议先通知物业。",
    "鱼骨通透，弹匣饱满，唯独钱包瘦得见骨。",
    "折起肉垫装乖巧，展开火力全靠手速。",
    "午睡前清空弹匣，醒来才有安静的好天气。",
    "折纸作业满分，实弹考试请勿对折枪管。",
    "猫抓板负责磨爪，这把负责给近处的敌人磨血条。",
    "两颗虎牙咬一口，下一口得先换弹。",
    "摇铃叫不醒装睡的猫，开这一枪肯定可以。",
    "先炸毛，再炸场；它的喂食量按弹匣计算。",
  ][i],
}));
export function randomWeapon(
  random: () => number,
  map: number,
  category?: WeaponClass,
  minTier = 1,
) {
  const unlocked = weapons.filter(
    (w) => (w.unlock ?? 0) <= map && (w.lootWeight ?? 1) > 0,
  );
  const ranked = unlocked.filter((w) => w.tier >= minTier);
  const available = ranked.length ? ranked : unlocked;
  const matching = available.filter(
    (w) => !category || w.weaponClass === category,
  );
  const pool = matching.length ? matching : available;
  const weights = pool.map(
    (w) => [0, 24, 12, 6, 3, 1][w.tier] * (w.lootWeight ?? 1),
  );
  let pick = random() * weights.reduce((sum, n) => sum + n, 0);
  for (let i = 0; i < pool.length; i++)
    if ((pick -= weights[i]) < 0) return pool[i];
  return pool[pool.length - 1];
}
export const armorDur = [40, 60, 80, 105, 130],
  helmetDur = [25, 40, 55, 75, 95];
const defenses: ItemDef[] = Array.from({ length: 5 }, (_, i) => [
  {
    id: `a${i + 1}`,
    name: ["旧帆布甲", "巡逻防弹衣", "突击护甲", "远征重甲", "九命复合甲"][i],
    kind: "armor" as Kind,
    tier: i + 1,
    price: [450, 1400, 3800, 8500, 18000][i],
    durability: armorDur[i],
    icon: "armor",
    desc: [
      "比纸箱结实一点，猫的自信多了很多。",
      "穿上开始巡逻，巡到饭点自动下班。",
      "突击时护胸，挨骂时护不住自尊。",
      "很重，但没主人对体重秤的怨念重。",
      "号称九命保险，理赔请先保留购买小票。",
    ][i],
    unlock: Math.max(0, i - 1),
  },
  {
    id: `h${i + 1}`,
    name: ["旧钢盔", "猫耳战术盔", "防弹头盔", "特勤面罩盔", "九命全覆盔"][i],
    kind: "helmet" as Kind,
    tier: i + 1,
    price: [250, 800, 2100, 5000, 11000][i],
    durability: helmetDur[i],
    icon: "helmet",
    desc: [
      "前任主人留下的刮痕，建议别问它是怎么留下的。",
      "给耳朵预留了位置，给坏主意没有。",
      "挡得住弹片，挡不住开罐头的声音。",
      "蒙面之后很神秘，打呼噜照样暴露身份。",
      "全方位保护，除了猫突然想舔自己的时候。",
    ][i],
    unlock: Math.max(0, i - 1),
  },
]).flat();
export const bags: ItemDef[] = [
  "布兜",
  "小鱼包",
  "邮差猫包",
  "远征猫箱",
  "九命行囊",
].map((name, i) => ({
  id: `b${i + 1}`,
  name,
  kind: "bag",
  tier: i + 1,
  price: [200, 900, 2500, 6000, 14000][i],
  capacity: [20, 30, 40, 55, 75][i],
  icon: "bag",
  desc: [
    "装得下梦想，贵重的梦想请分批运输。",
    "鱼在外面，战利品在里面，别抱着包啃。",
    "保证送达，不保证邮差不会半路钻进去睡觉。",
    "远征要轻装，猫决定只带最重的宝贝。",
    "能装九条命的行李，装不下第十次贪心。",
  ][i],
  unlock: Math.max(0, i - 1),
}));
export const ammo: ItemDef[] = [
  "练习豆弹",
  "铜爪弹",
  "银须穿甲弹",
  "黑曜猫牙弹",
].map((name, i) => ({
  id: `m${i + 1}`,
  name,
  kind: "ammo",
  tier: i + 1,
  price: [3, 8, 20, 55][i] * AMMO_STACK,
  icon: "ammo",
  desc: [
    "不是豌豆，请勿装进饭盆，否则敌我双方都很困惑。",
    "铜做的爪子，比剪完指甲的真爪更有说服力。",
    "胡须负责测距离，银须负责让距离不再安全。",
    "牙医看到这个口径，当场建议敌人拔腿就跑。",
  ][i],
  unlock: Math.max(0, i - 1),
}));
// Instant recovery is applied when eating completes; ongoing recovery continues while moving.
export const foods: ItemDef[] = [
  ...["小鱼干", "肉泥猫条", "金枪鱼罐头", "豪华海鲜拼盘"].map(
    (name, i): ItemDef => ({
      id: `f${i + 1}`,
      name,
      kind: "food",
      tier: i + 1,
      price: [120, 260, 520, 1000][i],
      heal: [12, 20, 30, 60][i],
      healOverTime: 0,
      healSeconds: 0,
      useTime: [1, 1.4, 2, 3][i],
      icon: ["fish", "tube", "can", "meal"][i],
      unlock: 0,
      desc: [
        "没有哪次受伤是一根鱼干解决不了的，有就再来一根。",
        "撕开包装的声音，比基地集合号有效十倍。",
        "拉环一响，附近的隐身猫全部解除潜行。",
        "盘子里是海鲜盛宴，盘子外是钱包的追悼会。",
      ][i],
    }),
  ),
  ...foodHomageRows.map(([id, name, tier, desc]): ItemDef => {
    const [heal, healOverTime, healSeconds, useTime, price] = (
      {
        c1_1: [0, 32, 12, 1.4, 260],
        c1_9: [0, 22, 10, 1, 120],
        c1_10: [28, 0, 0, 1.8, 520],
        c3_1: [18, 0, 0, 1.2, 260],
        c4_11: [24, 48, 16, 3, 1000],
        c4_8: [18, 28, 10, 1.8, 650],
      } as Record<string, number[]>
    )[id];
    return {
      id,
      name,
      tier,
      desc,
      heal,
      healOverTime,
      healSeconds,
      useTime,
      price,
      kind: "food",
      icon: "meal",
      unlock: 0,
    };
  }),
];
export function foodEffect(d: ItemDef) {
  return [
    d.heal ? `立即恢复 ${d.heal} 生命` : "",
    d.healOverTime
      ? `${d.healSeconds} 秒内持续恢复 ${d.healOverTime} 生命`
      : "",
  ]
    .filter(Boolean)
    .join("，");
}
export const collectibles: ItemDef[] = collectibleRows.map(
  ([id, name, tier, desc]) => {
    const peers = collectibleRows.filter((r) => r[2] === tier);
    const rank = peers.findIndex((r) => r[0] === id);
    const [low, high] = [
      [40, 120],
      [180, 450],
      [700, 1500],
      [3000, 7000],
      [15000, 34000],
    ][tier - 1];
    return {
      id,
      name,
      tier,
      desc,
      kind: "collectible",
      icon: "gem",
      price:
        id === "c4_0"
          ? 35000
          : Math.round(
              low + (rank / Math.max(1, peers.length - 1)) * (high - low),
            ),
    };
  },
);
export const items = [
  melee,
  ...weapons,
  ...defenses,
  ...bags,
  ...ammo,
  ...foods,
  ...collectibles,
];
applyItemTuning(items as unknown as { id: string; [key: string]: unknown }[]);
if (melee.rpm !== 60 / MELEE_SWING_SECONDS)
  MELEE_SWING_SECONDS = 60 / melee.rpm!;
for (let i = 0; i < 5; i++) {
  armorDur[i] = defenses.find((d) => d.id === `a${i + 1}`)!.durability!;
  helmetDur[i] = defenses.find((d) => d.id === `h${i + 1}`)!.durability!;
}
export const db: Record<string, ItemDef> = Object.fromEntries(
  items.map((i) => [i.id, i]),
);
export const kindNames: Record<Kind, string> = {
  melee: "近战武器",
  weapon: "武器",
  armor: "护甲",
  helmet: "头盔",
  bag: "背包",
  ammo: "子弹",
  food: "食物",
  collectible: "收集品",
};
export const makeItem = (id: string, qty = 1): Item => {
  const d = db[id];
  if (!d) throw Error("未知物品");
  return {
    uid: crypto.randomUUID(),
    id,
    qty,
    ...(d.durability
      ? { durability: d.durability, maxDurability: d.durability }
      : {}),
  };
};
// Remaining protection compares both grade and the actual durability left.
export const protection = (i: Item | null | undefined) =>
  i ? db[i.id].tier * Math.max(0, i.durability ?? 0) : 0;
export const weaponDamageScale = (durability: number) =>
  0.3 + 0.7 * Math.max(0, Math.min(1, durability / 30));
export function wearWeapon(i: Item) {
  const loss = db[i.id].durability! / 700;
  i.durability = Math.max(0, (i.durability ?? db[i.id].durability!) - loss);
  if (i.durability < 1e-8) i.durability = 0;
}
export const sale = (i: Item) =>
  Math.floor(
    db[i.id].price *
      SALE_RATIO *
      (db[i.id].kind === "ammo"
        ? i.qty / AMMO_STACK
        : db[i.id].kind === "food"
          ? i.qty
          : 1),
  );
export const stackLimit = (id: string) =>
  db[id].kind === "ammo" ? AMMO_STACK : db[id].kind === "food" ? FOOD_STACK : 1;
export const itemNameColor = (id: string) => collectibleColors[db[id].tier];
export const searchTime = (i: Item) => {
  const d = db[i.id];
  if (d.name === "星洲猫心") return 7;
  const ranges = [
      [40, 120],
      [180, 450],
      [700, 1500],
      [3000, 7000],
      [15000, 35000],
    ],
    times = [
      [0.25, 0.6],
      [0.6, 1.2],
      [1.5, 2.5],
      [3, 4.5],
      [5, 7],
    ],
    r = ranges[d.tier - 1],
    t = times[d.tier - 1];
  return (
    t[0] +
    Math.max(0, Math.min(1, (d.price - r[0]) / (r[1] - r[0]))) * (t[1] - t[0])
  );
};
export const ammoMult = [0.75, 0.88, 1, 1.15],
  penetration = [1, 2, 3, 5];
export function damage(
  base: number,
  ammoTier: number,
  armorTier: number,
  durability: number,
  head = false,
  distanceMultiplier = 1,
) {
  const p = penetration[ammoTier - 1];
  const reduction =
    durability <= 0 ? 1 : p > armorTier ? 0.85 : p === armorTier ? 0.63 : 0.28;
  return Math.max(
    1,
    base *
      ammoMult[ammoTier - 1] *
      reduction *
      (head ? 1.2 : 1) *
      distanceMultiplier,
  );
}
export const breeds = [
  {
    name: "拾荒田园",
    fur: "#b99575",
    patch: "#5b4a38",
    eye: "#a5c075",
    role: "scavenge",
  },
  {
    name: "侦察狸花",
    fur: "#9d8b72",
    patch: "#443d31",
    eye: "#d6bb5b",
    role: "scout",
  },
  {
    name: "哨兵英短",
    fur: "#98a4ae",
    patch: "#727d88",
    eye: "#d2a95c",
    role: "guard",
  },
  {
    name: "突击美短",
    fur: "#b5b8b5",
    patch: "#565d61",
    eye: "#9dbba0",
    role: "assault",
  },
  {
    name: "伏击暹罗",
    fur: "#d9cbb0",
    patch: "#574739",
    eye: "#86bfe0",
    role: "ambush",
  },
  {
    name: "斥候德文",
    fur: "#b5a498",
    patch: "#8a7c73",
    eye: "#c6d296",
    role: "flank",
  },
  {
    name: "游荡蓝猫",
    fur: "#849ca9",
    patch: "#637c8e",
    eye: "#92ca9c",
    role: "patrol",
  },
  {
    name: "爆破橘猫",
    fur: "#d69b57",
    patch: "#a66b34",
    eye: "#d5c07d",
    role: "grenade",
  },
  {
    name: "潜行黑猫",
    fur: "#444947",
    patch: "#242b2b",
    eye: "#d5c96a",
    role: "flank",
  },
  {
    name: "医护白猫",
    fur: "#e4e3da",
    patch: "#c7cbc8",
    eye: "#91bdca",
    role: "medic",
  },
  {
    name: "狙击布偶",
    fur: "#e4dfcf",
    patch: "#7b756c",
    eye: "#8bbbe6",
    role: "sniper",
  },
  {
    name: "猎手银渐",
    fur: "#d4d8d1",
    patch: "#9daba8",
    eye: "#88c5af",
    role: "flank",
  },
  {
    name: "精英金渐",
    fur: "#dfbd7e",
    patch: "#a28b61",
    eye: "#96b882",
    role: "elite",
  },
  {
    name: "护卫波斯",
    fur: "#d6c4b2",
    patch: "#ac9484",
    eye: "#cbb279",
    role: "heavy",
  },
  {
    name: "重装缅因",
    fur: "#9f8878",
    patch: "#605648",
    eye: "#d8c07d",
    role: "heavy",
  },
];
export interface BossDef {
  id: string;
  name: string;
  map: number;
  breed: number;
  hp: number;
  weapon: number;
  skill: string;
  x: number;
  y: number;
}
export const bosses: BossDef[] = [
  {
    id: "iron",
    name: "罐头监工·铁腮",
    map: 0,
    breed: 13,
    hp: 850,
    weapon: 18,
    skill: "shotgun",
    x: 1920,
    y: 590,
  },
  {
    id: "swift",
    name: "飞爪快递·闪尾",
    map: 1,
    breed: 5,
    hp: 850,
    weapon: 1,
    skill: "dash",
    x: 1780,
    y: 800,
  },
  {
    id: "yeed",
    name: "猫伊德",
    map: 2,
    breed: 11,
    hp: 1100,
    weapon: 5,
    skill: "reinforce",
    x: 1830,
    y: 550,
  },
  {
    id: "maine",
    name: "实验体·零号缅因",
    map: 3,
    breed: 14,
    hp: 1550,
    weapon: 7,
    skill: "charge",
    x: 710,
    y: 480,
  },
  {
    id: "frost",
    name: "安保总监·霜瞳",
    map: 3,
    breed: 11,
    hp: 1400,
    weapon: 8,
    skill: "shield",
    x: 1800,
    y: 1300,
  },
  {
    id: "doctor",
    name: "博士·无毛",
    map: 3,
    breed: -1,
    hp: 1900,
    weapon: 10,
    skill: "turret",
    x: 1950,
    y: 430,
  },
];
export const maps = [
  {
    name: "猫尾乡野",
    en: "CANNERY DISTRICT",
    sub: "村落、农田与河流。",
    color: "#dbba7f",
    ground: "#80935b",
    floor: "#b9a277",
    fee: 600,
    bosses: ["iron"],
    free: ["田间岔路 A", "农庄内院 B"],
    paid: "乡间运输点",
    zones: ["猎人小屋", "中央聚落", "农田谷仓", "铁腮农庄"],
    reward: 4000,
  },
  {
    name: "断尾高架",
    en: "BROKEN TAIL HIGHWAY",
    sub: "快递停运了，闪尾没有。",
    color: "#df9f6d",
    ground: "#726f5c",
    floor: "#9d967f",
    fee: 1200,
    bosses: ["swift"],
    free: ["排水隧道", "东侧维修坡"],
    paid: "修好的摩托",
    zones: ["维修站", "服务区", "物流仓", "收费站"],
    reward: 7500,
  },
  {
    name: "雾港猫城",
    en: "MISTHARBOR",
    sub: "雾散之前，别相信巷子里的脚步。",
    color: "#90b9b9",
    ground: "#536969",
    floor: "#849b96",
    fee: 2500,
    bosses: ["yeed"],
    free: ["下水道", "北码头吊篮"],
    paid: "走私船",
    zones: ["珠宝店", "海关楼", "旧酒店", "银行保险库"],
    reward: 12000,
  },
  {
    name: "月影研究站",
    en: "MOONSHADOW LAB",
    sub: "猫晶的秘密，藏在最后一道门后。",
    color: "#b4c8dd",
    ground: "#9aaeb1",
    floor: "#c6d1ce",
    fee: 5000,
    bosses: ["maine", "frost", "doctor"],
    free: ["雪原缆车", "废弃通风井"],
    paid: "应急直升猫",
    zones: ["兽笼区", "反应堆实验室", "样本库", "安保中枢"],
    reward: 20000,
  },
];
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function loot(random: () => number, map: number, high = false): Item {
  const roll = random(),
    tier =
      roll < (high ? 0.025 : 0.005)
        ? 5
        : roll < (high ? 0.15 : 0.04 + map * 0.012)
          ? 4
          : roll < (high ? 0.5 : 0.15 + map * 0.025)
            ? 3
            : roll < 0.42
              ? 2
              : 1;
  const pool = collectibles.filter((d) => d.tier === tier);
  return makeItem(weightedItem(pool, random).id);
}
export function mathQuestion(random: () => number) {
  const op = Math.floor(random() * 4);
  let a = Math.floor(random() * 11),
    b = Math.floor(random() * 11),
    answer = 0,
    symbol = "+";
  if (op === 0) {
    b = Math.floor(random() * (11 - a));
    answer = a + b;
  } else if (op === 1) {
    b = Math.floor(random() * (a + 1));
    answer = a - b;
    symbol = "−";
  } else if (op === 2) {
    a = Math.floor(random() * 6);
    b = Math.floor(random() * (Math.floor(10 / Math.max(a, 1)) + 1));
    answer = a * b;
    symbol = "×";
  } else {
    b = 1 + Math.floor(random() * 10);
    answer = Math.floor(random() * (Math.floor(10 / b) + 1));
    a = b * answer;
    symbol = "÷";
  }
  const choices = [answer];
  while (choices.length < 4) {
    const v = Math.floor(random() * 11);
    if (!choices.includes(v)) choices.push(v);
  }
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { text: `${a} ${symbol} ${b} = ?`, answer, choices };
}
