import generated from "virtual:game-tuning-catalog";
import { items, kindNames, weaponClassNames, type ItemDef } from "./data";
import { containerDefaults, editableItemFields } from "./game-tuning-runtime";
import published from "./game-tuning.json";
export type NumberEntry = {
  id: string;
  label: string;
  category: string;
  scope: string;
  base: number;
  value: number;
  min: number;
  max: number;
  integer: boolean;
  unit: string;
  probabilityGroup?: string;
  description: string;
  source: string;
  line: number;
};
export const catalog = generated as {
  schema: string;
  version: number;
  fingerprint: string;
  builtAt: string;
  entries: NumberEntry[];
};
export const itemCatalog = items.map((item) => ({
  ...item,
  buyPrice: item.buyPrice ?? item.price,
  shopLimit: item.shopLimit ?? (item.tier === 5 ? 1 : item.tier === 4 ? 2 : 0),
  lootWeight: item.lootWeight ?? 1,
}));
export const containerNames: Record<string, string> = {
  box: "纸箱",
  basket: "鸟窝",
  toolbox: "生锈工具盒",
  cooler: "乡间保温箱",
  trashcan: "绿色垃圾桶",
  litter: "猫砂桶",
  cabinet: "工具柜",
  medical: "医疗箱",
  weapon: "武器箱",
  bed: "豪华猫窝",
  safe: "保险箱",
  corpse: "普通战利品盒",
  "boss-corpse": "Boss战利品盒",
};
export const currentContainers = {
  ...containerDefaults,
  ...published.containers,
};
export const fieldNames: Record<string, string> = {
  tier: "稀有度等级",
  price: "物品基础价值",
  buyPrice: "商店售价",
  shopLimit: "商店限购（0为不限）",
  lootWeight: "同池掉落权重",
  damage: "伤害",
  mag: "弹匣容量",
  rpm: "射速 / 攻速",
  range: "射程 / 攻击距离",
  spread: "散布",
  reload: "换弹时间",
  capacity: "背包容量",
  heal: "立即恢复生命",
  healOverTime: "持续恢复总生命",
  healSeconds: "持续恢复时间",
  useTime: "食用时间",
  durability: "最大耐久",
  unlock: "解锁进度",
  pellets: "每枪弹丸数",
};
export function itemLabel(item: ItemDef) {
  return item.kind === "weapon"
    ? weaponClassNames[item.weaponClass!]
    : kindNames[item.kind];
}
export type Tuning = {
  schema: "tricat-game-tuning";
  version: 1;
  numbers: Record<string, { base: number; value: number }>;
  items: Record<string, Record<string, number>>;
  containers: Record<string, number>;
};
export const publishedTuning = published as Tuning;
export function itemRange(field: string, item: ItemDef) {
  if (field === "tier")
    return {
      min: 1,
      max: ["food", "ammo"].includes(item.kind) ? 4 : 5,
      integer: true,
    };
  if (field === "shopLimit") return { min: 0, max: 1000, integer: true };
  if (field === "unlock") return { min: 0, max: 3, integer: true };
  if (field === "mag" || field === "capacity" || field === "pellets")
    return { min: 1, max: field === "pellets" ? 50 : 1000, integer: true };
  if (["price", "buyPrice", "heal", "healOverTime"].includes(field))
    return { min: 0, max: 10000000, integer: false };
  if (field === "durability" || field === "range")
    return { min: 1, max: 1000000, integer: false };
  if (field === "rpm") return { min: 1, max: 6000, integer: false };
  if (field === "reload" || field === "useTime")
    return { min: 0.05, max: 120, integer: false };
  if (field === "spread")
    return {
      min: 0,
      max: Math.PI / ((item.pellets ?? 1) > 1 ? 1.075 : 1),
      integer: false,
    };
  return { min: 0, max: 1000000, integer: false };
}
export function validateTuning(value: unknown): Tuning {
  const v = value as Tuning;
  if (!v || v.schema !== "tricat-game-tuning" || v.version !== 1)
    throw Error("数值配置格式不匹配");
  for (const k of ["numbers", "items", "containers"] as const)
    if (!v[k] || typeof v[k] !== "object" || Array.isArray(v[k]))
      throw Error("缺少数值分组");
  const check = (n: unknown, min: number, max: number, integer = false) =>
    typeof n === "number" &&
    Number.isFinite(n) &&
    n >= min &&
    n <= max &&
    (!integer || Number.isInteger(n));
  const entries = new Map(catalog.entries.map((e) => [e.id, e]));
  for (const [id, patch] of Object.entries(v.numbers)) {
    const e = entries.get(id);
    if (
      !e ||
      !patch ||
      patch.base !== e.base ||
      !check(patch.value, e.min, e.max, e.integer)
    )
      throw Error("数值已过期或超出范围：" + (e?.label ?? id));
  }
  const probabilities = new Map<string, number>();
  for (const e of catalog.entries)
    if (e.probabilityGroup)
      probabilities.set(
        e.probabilityGroup,
        (probabilities.get(e.probabilityGroup) ?? 0) +
          (v.numbers[e.id]?.value ?? e.base),
      );
  for (const [k, sum] of probabilities)
    if (Math.abs(sum - 1) > 1e-6)
      throw Error(
        "稀有度概率合计必须为100%：" +
          catalog.entries.find((e) => e.probabilityGroup === k)!.label,
      );
  for (const [id, fields] of Object.entries(v.items)) {
    const item = itemCatalog.find((i) => i.id === id);
    if (!item || !fields || typeof fields !== "object" || Array.isArray(fields))
      throw Error("物品ID或属性无效：" + id);
    for (const [field, n] of Object.entries(fields)) {
      if (!editableItemFields.includes(field as any))
        throw Error("未知物品属性：" + field);
      const r = itemRange(field, item);
      if (!check(n, r.min, r.max, r.integer))
        throw Error(item.name + " / " + fieldNames[field] + "超出范围");
    }
  }
  for (const [type, count] of Object.entries(v.containers))
    if (!Object.hasOwn(containerDefaults, type) || !check(count, 1, 30, true))
      throw Error("容器数量无效：" + type);
  const effective = itemCatalog.map((i) => ({ ...i, ...v.items[i.id] }));
  if (
    effective.some(
      (i) => (i.healOverTime ?? 0) > 0 && !(i.healSeconds && i.healSeconds > 0),
    )
  )
    throw Error("持续恢复的补给品必须设置大于0的恢复时间");
  for (let tier = 1; tier <= 5; tier++)
    if (
      !effective.some(
        (i) =>
          i.kind === "collectible" &&
          i.tier === tier &&
          (i.lootWeight ?? 1) > 0,
      )
    )
      throw Error(tier + "级收集品掉落池不能为空");
  for (let map = 0; map <= 3; map++)
    if (
      !effective.some(
        (i) =>
          i.kind === "weapon" &&
          (i.unlock ?? 0) <= map &&
          (i.lootWeight ?? 1) > 0,
      )
    )
      throw Error("地图" + (map + 1) + "的可用武器掉落池不能为空");
  if (
    !effective.some((i) => i.kind === "weapon" && (i.lootWeight ?? 1) > 0) ||
    !effective.some((i) => i.kind === "food" && (i.lootWeight ?? 1) > 0)
  )
    throw Error("武器和食物掉落池不能为空");
  const firstFoods = itemCatalog
    .filter((i) => i.kind === "food")
    .slice(0, 3)
    .map((i) => i.id);
  if (
    !effective.some((i) => firstFoods.includes(i.id) && (i.lootWeight ?? 1) > 0)
  )
    throw Error("基础食物掉落池不能为空");
  return structuredClone(v);
}
