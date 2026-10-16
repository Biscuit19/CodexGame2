export type Kind =
  | "weapon"
  | "armor"
  | "helmet"
  | "bag"
  | "ammo"
  | "food"
  | "collectible"
  | "melee";
export interface ItemDef {
  id: string;
  name: string;
  kind: Kind;
  tier: number;
  price: number;
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
  useTime?: number;
  durability?: number;
  unlock?: number;
}
export interface Item {
  uid: string;
  id: string;
  qty: number;
  durability?: number;
  maxDurability?: number;
  loaded?: { tier: number; count: number };
}
export const AMMO_STACK = 90,
  BASE_PACK = 20,
  EXTRACT_SECONDS = 3;
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
  desc: "近身挥击 · 不消耗弹药",
  damage: 48,
  range: 85,
  rpm: 120,
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
export const capacities = [60, 80, 120, 200, 450],
  warehouseCosts = [0, 8000, 25000, 70000, 160000];
export const safeCap = [1, 2, 4, 6],
  safePrice = [0, 12000, 45000, 120000],
  safeNames = ["旧铁盒", "双鱼盒", "四爪保险箱", "六命保险箱"];
export const weapons: ItemDef[] = [
  ["绒球-9", 18, 30, 720, 360, 0.12, 1.5, 900, 1],
  ["呼噜冲锋", 15, 40, 900, 310, 0.18, 1.7, 2100, 2],
  ["短尾 .45", 23, 25, 600, 340, 0.14, 1.8, 3200, 2],
  ["猫爪 56", 28, 30, 600, 550, 0.045, 2, 2800, 2],
  ["长须 4A1", 25, 30, 680, 580, 0.028, 1.8, 5500, 3],
  ["虎斑 7.62", 35, 25, 500, 570, 0.06, 2.2, 6200, 3],
  ["三花卡宾", 24, 30, 650, 520, 0.032, 1.6, 4200, 2],
  ["黑尾战斗步枪", 39, 20, 420, 650, 0.035, 2.3, 10500, 4],
  ["罐头开盖器", 42, 15, 260, 700, 0.018, 2.1, 8500, 3],
  ["望月栓狙", 85, 5, 45, 1000, 0, 2.8, 7000, 3],
  ["静爪半自动", 62, 10, 150, 900, 0, 2.4, 12000, 4],
  ["九命重狙", 125, 3, 28, 1200, 0, 3, 24000, 5],
].map((r, i) => ({
  id: `w${i}`,
  name: r[0] as string,
  kind: "weapon",
  icon: i < 3 ? "smg" : i < 9 ? "rifle" : "sniper",
  damage: r[1] as number,
  mag: r[2] as number,
  rpm: r[3] as number,
  range: r[4] as number,
  spread: r[5] as number,
  reload: r[6] as number,
  price: r[7] as number,
  tier: r[8] as number,
  durability: [100, 125, 150, 185, 220][(r[8] as number) - 1],
  unlock: Math.min(3, Math.max(0, (r[8] as number) - 2)),
  desc:
    i < 3
      ? "近距离 · 全自动 · 快速压制"
      : i < 9
        ? "中距离 · 稳定点射"
        : "远距离 · 精准射击 · 无散布",
}));
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
    desc: `${i + 1} 级防护 · 可在基地修复`,
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
    desc: "头部防护 · 耳朵也要保护好",
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
  desc: `${[20, 30, 40, 55, 75][i]} 格容量 · 每件物品一格`,
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
  desc: `90 发/组 · 穿透 ${[1, 2, 3, 5][i]} 级`,
  unlock: Math.max(0, i - 1),
}));
export const foods: ItemDef[] = [
  "小鱼干",
  "肉泥猫条",
  "金枪鱼罐头",
  "豪华海鲜拼盘",
].map((name, i) => ({
  id: `f${i + 1}`,
  name,
  kind: "food",
  tier: i + 1,
  price: [120, 260, 520, 1000][i],
  heal: [20, 35, 60, 100][i],
  useTime: [1, 1.4, 2, 3][i],
  icon: ["fish", "tube", "can", "meal"][i],
  desc: `恢复 ${[20, 35, 60, 100][i]} 生命 · ${[1, 1.4, 2, 3][i]} 秒`,
  unlock: 0,
}));
const lootNames = [
  "磨牙木块|旧铃铛|半包猫砂|塑料瓶盖|弯曲饭勺|掉毛滚筒|单只拖鞋|空鱼罐头|断线耳机|快递纸箱|褪色逗猫棒|猫当劳番茄包",
  "金枪鱼猫条|猫薄荷香包|合金饭盆|便携猫抓板|充电暖爪宝|猫猫恋爱指南|自动红点笔|八成新键盘|折叠猫窝|喵哈哈矿泉水|肯喵基薯条|宜猫六角扳手",
  "战术猫罐头|机械逗猫棒|古董项圈|夜视鼠标|猫奈儿零钱包|喵星降噪耳机|猫为折叠手机|特撕拉车钥匙|哈利猫法杖|银河系漫游毛巾|猫勒比金币|超级玛喵卡带",
  "沙海之瞳|黄金猫砂铲|翡翠鱼骨|皇家绒垫|猫力士潜水表|蒂猫妮钻石圈|路易喵登旅行箱|喵界旋转陀螺|矩阵红色猫粮|侦探烟斗|光剑逗猫棒|午夜蝙蝠猫面具",
  "星洲猫心|永恒罐头|九命怀表|月神毛线球|时间猫眼石|无限猫爪套|至尊开罐圣剑|喵娜丽莎真迹|黄金羊毛团|琥珀猫薄荷|头号猫家游戏蛋|宇宙终极鱼干",
];
const lootIcons = [
  [
    "wood",
    "bell",
    "bag",
    "coin",
    "tool",
    "tool",
    "shoe",
    "can",
    "headphone",
    "box",
    "wand",
    "tube",
  ],
  [
    "tube",
    "leaf",
    "meal",
    "board",
    "phone",
    "book",
    "wand",
    "keyboard",
    "bed",
    "bottle",
    "fries",
    "tool",
  ],
  [
    "can",
    "wand",
    "collar",
    "mouse",
    "purse",
    "headphone",
    "phone",
    "key",
    "wand",
    "cloth",
    "coin",
    "cartridge",
  ],
  [
    "gem",
    "tool",
    "fish",
    "bed",
    "watch",
    "collar",
    "case",
    "top",
    "pill",
    "pipe",
    "sword",
    "mask",
  ],
  [
    "heart",
    "can",
    "watch",
    "yarn",
    "gem",
    "glove",
    "sword",
    "painting",
    "yarn",
    "amber",
    "egg",
    "fish",
  ],
];
const descriptions: Record<string, string> = {
  猫猫恋爱指南: "第一页写着慢慢眨眼，后面全是空白。",
  猫奈儿零钱包: "能装下九条命，却装不下一根完整猫条。",
  喵界旋转陀螺: "它停下的时候，说明你终于醒了。",
  时间猫眼石: "可以倒流七秒，通常用来挽救打翻的罐头。",
  星洲猫心: "沙海最深处的猫眼宝石。七秒，够心跳快一次。",
  无限猫爪套: "集齐六颗宝石，也只能打出一个肉垫巴掌。",
  至尊开罐圣剑: "勇者拔出了剑，发现罐头是拉环的。",
  特撕拉车钥匙: "车不一定会来，附近的猫一定会来。",
};
export const collectibles: ItemDef[] = lootNames.flatMap((s, t) =>
  s.split("|").map((name, i) => ({
    id: `c${t}_${i}`,
    name,
    kind: "collectible",
    tier: t + 1,
    price:
      name === "星洲猫心"
        ? 35000
        : Math.round(
            [
              [40, 120],
              [180, 450],
              [700, 1500],
              [3000, 7000],
              [15000, 34000],
            ][t][0] +
              (i / 11) *
                ([
                  [40, 120],
                  [180, 450],
                  [700, 1500],
                  [3000, 7000],
                  [15000, 34000],
                ][t][1] -
                  [
                    [40, 120],
                    [180, 450],
                    [700, 1500],
                    [3000, 7000],
                    [15000, 34000],
                  ][t][0]),
          ),
    icon: lootIcons[t][i],
    desc:
      descriptions[name] ||
      [
        "小小的旧物，也藏着一段猫生。",
        "在战区里，实用比漂亮更重要。",
        "识货的猫会给它一个好价钱。",
        "保存完好，连挑剔的猫都挪不开眼。",
        "很少有猫亲眼见过它。带回暖窝吧。",
      ][t],
  })),
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
  food: "补给",
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
    db[i.id].price * 0.65 * (db[i.id].kind === "ammo" ? i.qty / AMMO_STACK : 1),
  );
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
export const ammoMult = [0.9, 1, 1.12, 1.28],
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
      (head ? 1.5 : 1) *
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
    hp: 650,
    weapon: 2,
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
    name: "旧罐头厂",
    en: "CANNERY DISTRICT",
    sub: "生锈的流水线，还留着鱼的味道。",
    color: "#dbba7f",
    ground: "#686e4b",
    floor: "#98977a",
    fee: 600,
    bosses: ["iron"],
    free: ["西侧破洞", "南侧货运门"],
    paid: "猫粮卡车",
    zones: ["冷库", "加工车间", "装卸仓", "厂长办公室"],
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
  return makeItem(pool[Math.floor(random() * pool.length)].id);
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
