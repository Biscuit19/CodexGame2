import published from "./game-tuning.json";
type Config = {
  numbers: Record<string, { base: number; value: number }>;
  items: Record<string, Record<string, number>>;
  containers: Record<string, number>;
};
const config = published as Config;
export function gameNumber(id: string, base: number) {
  const p = config.numbers[id];
  return p && p.base === base && Number.isFinite(p.value) ? p.value : base;
}
export const editableItemFields = [
  "tier",
  "price",
  "buyPrice",
  "shopLimit",
  "damage",
  "mag",
  "rpm",
  "range",
  "spread",
  "reload",
  "capacity",
  "heal",
  "healOverTime",
  "healSeconds",
  "useTime",
  "durability",
  "unlock",
  "pellets",
  "lootWeight",
] as const;
export function applyItemTuning(
  items: { id: string; [key: string]: unknown }[],
) {
  for (const item of items) {
    const patch = config.items[item.id];
    if (patch)
      for (const field of editableItemFields)
        if (Object.hasOwn(patch, field) && Number.isFinite(patch[field]))
          item[field] = patch[field];
  }
}
export const containerDefaults: Record<string, number> = {
  box: 2,
  basket: 2,
  toolbox: 2,
  cooler: 2,
  trashcan: 2,
  litter: 2,
  cabinet: 2,
  medical: 2,
  weapon: 3,
  bed: 3,
  safe: 3,
};
export function containerCount(type: string) {
  return config.containers[type] ?? containerDefaults[type] ?? 2;
}
export function weightedItem<T extends { lootWeight?: number }>(
  pool: T[],
  random: () => number,
): T {
  const available = pool.filter((p) => (p.lootWeight ?? 1) > 0);
  if (!available.length) throw Error("掉落池没有可用物品");
  let roll = random() * available.reduce((n, p) => n + (p.lootWeight ?? 1), 0);
  for (const p of available) if ((roll -= p.lootWeight ?? 1) < 0) return p;
  return available[available.length - 1];
}
