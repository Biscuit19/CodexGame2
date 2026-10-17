import {
  db,
  makeItem,
  sale,
  capacities,
  warehouseCosts,
  safeCap,
  safePrice,
  bosses,
  type Item,
  AMMO_STACK,
  BASE_PACK,
  stackLimit,
  takeQuantity,
  collectibles,
} from "./data";
export type Equipment = {
  primary: Item | null;
  secondary: Item | null;
  armor: Item | null;
  helmet: Item | null;
  bag: Item | null;
  ammo: Item | null;
  melee: Item | null;
  food: Item | null;
};
export interface Settings {
  master: number;
  music: number;
  sfx: number;
  shake: number;
  aim: string;
}
export interface Save {
  temporary?: boolean;
  version: 1;
  slot: number;
  name: string;
  mode: "easy" | "standard";
  easyUsed: boolean;
  coins: number;
  warehouse: number;
  safe: number;
  stash: Item[];
  pack: Item[];
  secure: Item[];
  equipment: Equipment;
  defeated: string[];
  collection: string[];
  discovered?: string[];
  overflow: Item[];
  buyback: Item[];
  stock?: Record<string, number>;
  loadedRounds?: { weapon: string; tier: number; count: number }[];
  pendingMap?: number;
  raidBackup?: string;
  stats: {
    raids: number;
    extracts: number;
    kills: number;
    deaths: number;
    value: number;
    time: number;
  };
  completed: boolean;
  ng: number;
  settings: Settings;
  tutorial: boolean;
  pending: boolean;
  updated: number;
  result?: Result;
}
export interface Result {
  success: boolean;
  reason: string;
  map: number;
  kills: number;
  searches: number;
  value: number;
  time: number;
  damageDealt: number;
  damageTaken: number;
  bosses: string[];
  reward: number;
}
export const defaults: Settings = {
  master: 0.65,
  music: 0.25,
  sfx: 0.7,
  shake: 0.35,
  aim: "#edd39a",
};
export function newSave(slot = 0): Save {
  const save: Save = {
    version: 1,
    slot,
    name: "三花七号",
    mode: "standard",
    easyUsed: false,
    coins: 4500,
    warehouse: 0,
    safe: 0,
    stash: [
      makeItem("w3"),
      makeItem("m1", 30),
      makeItem("m1", 30),
      makeItem("f2"),
      makeItem("f2"),
    ],
    pack: [
      makeItem("m1", 30),
      makeItem("m1", 30),
      makeItem("m1", 30),
      makeItem("f1"),
      makeItem("f2"),
    ],
    secure: [],
    equipment: {
      primary: makeItem("w0"),
      secondary: null,
      armor: makeItem("a1"),
      helmet: makeItem("h1"),
      bag: makeItem("b1"),
      ammo: makeItem("m1", 90),
      melee: makeItem("k0"),
      food: null,
    },
    defeated: [],
    collection: [],
    discovered: [],
    overflow: [],
    buyback: [],
    stats: { raids: 0, extracts: 0, kills: 0, deaths: 0, value: 0, time: 0 },
    completed: false,
    ng: 0,
    settings: { ...defaults },
    tutorial: false,
    pending: false,
    updated: Date.now(),
  };
  normalizeAmmo(save.pack);
  normalizeAmmo(save.stash);
  return save;
}
export function newTestingSave() {
  const save = newSave();
  save.temporary = true;
  save.name = "测试干员";
  save.coins = 999999;
  save.collection = collectibles.map((item) => item.id);
  save.discovered = [...save.collection];
  return save;
}
const key = (slot: number) => `tricat.save.${slot}`;
let database: IDBDatabase | undefined;
export let saveIssue = "";
export async function initDB() {
  try {
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("tricat", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("saves");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch {
    saveIssue = "浏览器未开放数据库，正在使用本地备份存档。";
  }
}
export function validateSave(data: unknown): Save {
  const s = structuredClone(data) as Save;
  if (
    !s ||
    s.version !== 1 ||
    (s.temporary !== undefined && typeof s.temporary !== "boolean") ||
    !Number.isInteger(s.slot) ||
    s.slot < 0 ||
    s.slot > 2 ||
    !["easy", "standard"].includes(s.mode) ||
    !Number.isFinite(s.coins) ||
    s.coins < 0 ||
    s.coins > 1e12 ||
    !Number.isInteger(s.warehouse) ||
    s.warehouse < 0 ||
    s.warehouse > 4 ||
    !Number.isInteger(s.safe) ||
    s.safe < 0 ||
    s.safe > 3 ||
    typeof s.name !== "string" ||
    s.name.length > 24 ||
    !s.equipment ||
    !s.stats ||
    !s.settings
  )
    throw Error("存档格式不受支持");
  if (
    s.raidBackup !== undefined &&
    (typeof s.raidBackup !== "string" || s.raidBackup.length > 2000000)
  )
    throw Error("出击备份无效");
  const all: Item[] = [];
  if (
    !Number.isInteger(s.ng) ||
    s.ng < 0 ||
    s.ng > 10000 ||
    !Number.isFinite(s.updated) ||
    s.updated < 0 ||
    ["easyUsed", "completed", "tutorial", "pending"].some(
      (k) => typeof s[k as keyof Save] !== "boolean",
    )
  )
    throw Error("进度格式无效");
  for (const n of [
    "raids",
    "extracts",
    "kills",
    "deaths",
    "value",
    "time",
  ] as const)
    if (!Number.isFinite(s.stats[n]) || s.stats[n] < 0)
      throw Error("统计字段无效");
  if (s.result) {
    const r = s.result;
    if (
      !Number.isInteger(r.map) ||
      r.map < 0 ||
      r.map > 3 ||
      typeof r.success !== "boolean" ||
      typeof r.reason !== "string" ||
      !Array.isArray(r.bosses) ||
      r.bosses.some((id) => !bosses.some((b) => b.id === id)) ||
      [
        "kills",
        "searches",
        "value",
        "time",
        "damageDealt",
        "damageTaken",
        "reward",
      ].some(
        (k) =>
          !Number.isFinite(r[k as keyof Result]) ||
          Number(r[k as keyof Result]) < 0,
      )
    )
      throw Error("结算数据无效");
  }
  for (const field of [
    "stash",
    "pack",
    "secure",
    "overflow",
    "buyback",
  ] as const) {
    if (!Array.isArray(s[field]) || s[field].length > 1000)
      throw Error("物品列表无效");
    all.push(...s[field]);
  }
  all.push(...Object.values(s.equipment).filter((x): x is Item => !!x));
  const ids = new Set<string>();
  for (const i of all) {
    if (
      !i ||
      !Object.hasOwn(db, i.id) ||
      typeof i.uid !== "string" ||
      ids.has(i.uid) ||
      !Number.isInteger(i.qty) ||
      i.qty < 1 ||
      i.qty > stackLimit(i.id) ||
      (i.raidBrought !== undefined &&
        (!Number.isInteger(i.raidBrought) ||
          i.raidBrought < 0 ||
          i.raidBrought > i.qty))
    )
      throw Error("物品数据无效");
    ids.add(i.uid);
    // Pre-durability saves contain valid guns without durability fields.
    if (
      db[i.id].kind === "weapon" &&
      i.durability === undefined &&
      i.maxDurability === undefined
    )
      i.durability = i.maxDurability = db[i.id].durability;
    if (
      i.loaded &&
      (db[i.id].kind !== "weapon" ||
        !Number.isInteger(i.loaded.count) ||
        i.loaded.count < 0 ||
        i.loaded.count > db[i.id].mag! ||
        !Number.isInteger(i.loaded.tier) ||
        i.loaded.tier < 1 ||
        i.loaded.tier > 4 ||
        (i.loaded.raidBrought !== undefined &&
          (!Number.isInteger(i.loaded.raidBrought) ||
            i.loaded.raidBrought < 0 ||
            i.loaded.raidBrought > i.loaded.count)))
    )
      throw Error("武器弹匣无效");
    if (
      db[i.id].durability &&
      (!Number.isFinite(i.durability) ||
        !Number.isFinite(i.maxDurability) ||
        (i.durability ?? -1) < 0 ||
        (i.maxDurability ?? 0) <= 0 ||
        (i.durability ?? 0) > (i.maxDurability ?? 0) ||
        (i.maxDurability ?? 0) > db[i.id].durability!)
    )
      throw Error("耐久数据无效");
  }
  for (const [slot, kind] of Object.entries({
    primary: "weapon",
    secondary: "weapon",
    armor: "armor",
    helmet: "helmet",
    bag: "bag",
    ammo: "ammo",
    melee: "melee",
    food: "food",
  })) {
    const i = s.equipment[slot as keyof Equipment];
    if (i && db[i.id].kind !== kind) throw Error("装备栏位无效");
  }
  if (
    s.secure.length > safeCap[s.safe] ||
    !Array.isArray(s.defeated) ||
    s.defeated.some((id) => !bosses.some((b) => b.id === id)) ||
    !Array.isArray(s.collection) ||
    s.collection.some((id) => !db[id])
  )
    throw Error("进度数据无效");
  if (
    s.discovered !== undefined &&
    (!Array.isArray(s.discovered) || s.discovered.some((id) => !db[id]))
  )
    throw Error("发现记录无效");
  s.discovered = [...new Set([...(s.discovered ?? []), ...s.collection])];
  s.collection = [
    ...new Set(s.collection.filter((id) => db[id].kind === "collectible")),
  ];
  for (const n of Object.values(s.stats))
    if (!Number.isFinite(n) || n < 0) throw Error("统计数据无效");
  for (const n of ["master", "music", "sfx", "shake"] as const)
    if (
      !Number.isFinite(s.settings[n]) ||
      s.settings[n] < 0 ||
      s.settings[n] > 1
    )
      throw Error("设置数据无效");
  if (!/^#[0-9a-f]{6}$/i.test(s.settings.aim)) throw Error("瞄准色无效");
  if (s.loadedRounds) {
    if (!Array.isArray(s.loadedRounds) || s.loadedRounds.length > 2)
      throw Error("弹匣记录无效");
    for (const r of s.loadedRounds) {
      const weapon = [s.equipment.primary, s.equipment.secondary].find(
        (i) => i?.uid === r.weapon,
      );
      if (
        !weapon ||
        !Number.isInteger(r.tier) ||
        r.tier < 1 ||
        r.tier > 4 ||
        !Number.isInteger(r.count) ||
        r.count < 0 ||
        r.count > db[weapon.id].mag!
      )
        throw Error("弹匣记录无效");
    }
  }
  return migrateInventory(s);
}
export function persist(s: Save) {
  if (s.temporary) return;
  s.updated = Date.now();
  try {
    const old = localStorage.getItem(key(s.slot));
    if (old) {
      try {
        validateSave(JSON.parse(old));
        localStorage.setItem(key(s.slot) + ".bak", old);
      } catch {
        /* keep last good backup */
      }
    }
    localStorage.setItem(key(s.slot), JSON.stringify(s));
  } catch {
    saveIssue = "本地存储空间不足，请及时导出存档。";
  }
  if (database) {
    try {
      const tx = database.transaction("saves", "readwrite");
      tx.objectStore("saves").put(structuredClone(s), s.slot);
      tx.onerror = () => {
        saveIssue = "数据库写入失败，请导出存档备份。";
      };
    } catch {
      saveIssue = "数据库暂不可用，已保留本地备份。";
    }
  }
}
export async function load(slot: number): Promise<Save | null> {
  let candidates: unknown[] = [];
  try {
    for (const k of [key(slot), key(slot) + ".bak"]) {
      const value = localStorage.getItem(k);
      if (value)
        try {
          candidates.push(JSON.parse(value));
        } catch {
          saveIssue = "检测到损坏的存档，已尝试恢复最近有效备份。";
        }
    }
  } catch {
    /* fallback to IndexedDB */
  }
  if (database)
    try {
      const value = await new Promise((resolve, reject) => {
        const r = database!.transaction("saves").objectStore("saves").get(slot);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (value) candidates.push(value);
    } catch {
      /* fallback */
    }
  const valid: Save[] = [];
  for (const c of candidates)
    try {
      valid.push(validateSave(c));
    } catch {
      saveIssue = "检测到损坏的存档，已尝试恢复最近有效备份。";
    }
  const best = valid.sort((a, b) => b.updated - a.updated)[0];
  return best ? migrateInventory(best) : null;
}
export const unlocked = (s: Save) =>
  s.temporary
    ? 3
    : Math.min(
        3,
        ["iron", "swift", "yeed"].filter((id) => s.defeated.includes(id))
          .length,
      );
export const packCapacity = (s: Save) =>
  s.equipment.bag ? db[s.equipment.bag.id].capacity! : BASE_PACK;
export function put(list: Item[], item: Item, capacity: number) {
  if (!canPut(list, item, capacity)) return false;
  normalizeStacks(list);
  const limit = stackLimit(item.id);
  if (limit === 1) {
    list.push(item);
    return true;
  }
  appendStack(list, item);
  return true;
}
function appendStack(list: Item[], item: Item) {
  const remaining = { ...item },
    limit = stackLimit(item.id);
  for (const stack of list) {
    if (stack.id !== item.id) continue;
    const part = takeQuantity(
      remaining,
      Math.min(limit - stack.qty, remaining.qty),
    );
    stack.qty += part.qty;
    if (part.raidBrought)
      stack.raidBrought = (stack.raidBrought ?? 0) + part.raidBrought;
    if (!remaining.qty) return;
  }
  while (remaining.qty > 0) {
    const part = takeQuantity(remaining, Math.min(limit, remaining.qty));
    if (list.some((i) => i.uid === part.uid)) part.uid = crypto.randomUUID();
    list.push(part);
  }
}
export function normalizeStacks(list: Item[]) {
  const result: Item[] = [];
  for (const item of list) {
    if (stackLimit(item.id) === 1) result.push(item);
    else appendStack(result, item);
  }
  list.splice(0, list.length, ...result);
}
// Legacy imports continue normalizing both ammunition and supplies.
export const normalizeAmmo = normalizeStacks;
export function migrateInventory(s: Save) {
  s.equipment.ammo ??= null;
  s.equipment.food ??= null;
  if (!Object.hasOwn(s.equipment, "melee")) s.equipment.melee = makeItem("k0");
  for (const r of s.loadedRounds ?? []) {
    const w = [s.equipment.primary, s.equipment.secondary].find(
      (i) => i?.uid === r.weapon,
    );
    if (w && !w.loaded) w.loaded = { tier: r.tier, count: r.count };
  }
  delete s.loadedRounds;
  if (s.overflow.length) {
    s.stash.push(...s.overflow);
    s.overflow = [];
    while (s.stash.length > capacities[s.warehouse] && s.warehouse < 4)
      s.warehouse++;
  }
  [s.pack, s.stash, s.secure].forEach(normalizeAmmo);
  return s;
}
// Capacity is checked before merging, so a failed move never partially mutates a stack.
export function canPut(list: Item[], item: Item, capacity: number) {
  const limit = stackLimit(item.id);
  const free =
    limit > 1
      ? list
          .filter((i) => i.id === item.id)
          .reduce((n, i) => n + Math.max(0, limit - i.qty), 0)
      : 0;
  return free + Math.max(0, capacity - list.length) * limit >= item.qty;
}
export function move(
  s: Save,
  from: "stash" | "pack" | "secure" | "overflow",
  to: "stash" | "pack" | "secure",
  uid: string,
) {
  if (from === to) return false;
  const i = s[from].find((x) => x.uid === uid);
  if (!i) return false;
  const cap =
    to === "stash"
      ? capacities[s.warehouse]
      : to === "pack"
        ? packCapacity(s)
        : safeCap[s.safe];
  if (!canPut(s[to], i, cap)) return false;
  s[from] = s[from].filter((x) => x.uid !== uid);
  put(s[to], i, cap);
  persist(s);
  return true;
}
export function swapWeaponSlots(
  s: Save,
  from: "primary" | "secondary",
  to: "primary" | "secondary",
) {
  if (from === to || !s.equipment[from]) return false;
  [s.equipment[from], s.equipment[to]] = [s.equipment[to], s.equipment[from]];
  persist(s);
  return true;
}
export function equip(
  s: Save,
  from: "stash" | "pack" | "overflow" | "secure",
  uid: string,
  secondary = false,
) {
  const list = s[from],
    i = list.find((x) => x.uid === uid);
  if (!i) return false;
  const kind = db[i.id].kind;
  const slot =
    kind === "weapon"
      ? secondary
        ? "secondary"
        : "primary"
      : ["armor", "helmet", "bag", "ammo", "melee", "food"].includes(kind)
        ? (kind as keyof Equipment)
        : null;
  if (!slot) return false;
  const old = s.equipment[slot];
  const next = list.filter((x) => x.uid !== uid);
  if (old) next.push(old);
  const newPackCap =
    kind === "bag" ? (db[i.id].capacity ?? BASE_PACK) : packCapacity(s);
  if ((from === "pack" ? next : s.pack).length > newPackCap) return false;
  const sourceCap =
    from === "stash"
      ? capacities[s.warehouse]
      : from === "secure"
        ? safeCap[s.safe]
        : from === "pack"
          ? newPackCap
          : Infinity;
  if (next.length > sourceCap) return false;
  s[from] = next;
  normalizeAmmo(s[from]);
  s.equipment[slot] = i;
  persist(s);
  return true;
}
export function buy(s: Save, id: string) {
  const d = db[id];
  if (
    !d ||
    d.kind === "collectible" ||
    s.coins < d.price ||
    unlocked(s) < (d.unlock ?? 0) ||
    (d.tier >= 4 && (s.stock?.[id] ?? 0) >= (d.tier === 5 ? 1 : 2))
  )
    return false;
  const i = makeItem(id, d.kind === "ammo" ? AMMO_STACK : 1);
  if (!canPut(s.stash, i, capacities[s.warehouse])) return false;
  s.coins -= d.price;
  put(s.stash, i, capacities[s.warehouse]);
  s.stock ??= {};
  s.stock[id] = (s.stock[id] ?? 0) + 1;
  persist(s);
  return true;
}
export function buyBack(s: Save, uid: string) {
  const lost = s.buyback.find((i) => i.uid === uid);
  if (
    !lost ||
    db[lost.id].kind === "collectible" ||
    unlocked(s) < (db[lost.id].unlock ?? 0)
  )
    return false;
  const d = db[lost.id],
    cost = Math.ceil(
      d.price *
        (d.kind === "ammo"
          ? lost.qty / AMMO_STACK
          : d.kind === "food"
            ? lost.qty
            : 1),
    );
  if (s.coins < cost || !canPut(s.stash, lost, capacities[s.warehouse]))
    return false;
  s.coins -= cost;
  s.buyback = s.buyback.filter((i) => i !== lost);
  const replacement = makeItem(lost.id, lost.qty);
  if (lost.loaded) replacement.loaded = { ...lost.loaded };
  put(s.stash, replacement, capacities[s.warehouse]);
  persist(s);
  return true;
}
export function sell(
  s: Save,
  from: "stash" | "overflow" | "pack",
  uid: string,
) {
  const i = s[from].find((x) => x.uid === uid);
  if (!i) return 0;
  const price = sale(i);
  s.coins += price;
  s[from] = s[from].filter((x) => x.uid !== uid);
  persist(s);
  return price;
}
export function stashAll(s: Save) {
  if (s.pending) return { moved: 0, left: s.pack.length };
  let moved = 0;
  for (const i of [...s.pack]) if (move(s, "pack", "stash", i.uid)) moved++;
  return { moved, left: s.pack.length };
}
export function upgradeWarehouse(s: Save) {
  if (s.warehouse >= 4 || s.coins < warehouseCosts[s.warehouse + 1])
    return false;
  s.coins -= warehouseCosts[++s.warehouse];
  persist(s);
  return true;
}
export function upgradeSafe(s: Save, level: number) {
  if (
    level <= s.safe ||
    level > 3 ||
    s.coins < safePrice[level] ||
    (level === 3 && !s.defeated.includes("yeed"))
  )
    return false;
  s.coins -= safePrice[level];
  s.safe = level;
  persist(s);
  return true;
}
export function repairCost(i: Item) {
  return Math.ceil(
    ((i.maxDurability ?? 0) - (i.durability ?? 0)) *
      db[i.id].tier *
      (db[i.id].kind === "weapon" ? 4 : 9),
  );
}
export function repair(s: Save, slot: keyof Equipment | Item) {
  if (s.pending) return false;
  const i =
    typeof slot === "string"
      ? s.equipment[slot]
      : [...s.pack, ...s.stash, ...Object.values(s.equipment)].find(
          (v) => v?.uid === slot.uid,
        );
  if (!i) return false;
  if (!["weapon", "armor", "helmet"].includes(db[i.id].kind)) return false;
  const cost = repairCost(i);
  if (!cost || s.coins < cost) return false;
  const loss = (i.maxDurability ?? 0) - (i.durability ?? 0);
  s.coins -= cost;
  i.maxDurability = Math.max(
    db[i.id].durability! * 0.55,
    i.maxDurability! - loss * 0.12,
  );
  i.durability = i.maxDurability;
  persist(s);
  return true;
}
export function beginRaid(s: Save) {
  if (s.pending || (!s.equipment.primary && !s.equipment.melee)) return false;
  s.raidBackup = JSON.stringify({ ...s, raidBackup: undefined });
  s.pending = true;
  s.stats.raids++;
  s.result = undefined;
  persist(s);
  return true;
}
export function settle(s: Save, r: Result) {
  if (!s.pending) return false;
  s.pending = false;
  for (const item of [
    ...s.pack,
    ...s.secure,
    ...Object.values(s.equipment).filter((i): i is Item => !!i),
  ]) {
    delete item.raidBrought;
    if (item.loaded) delete item.loaded.raidBrought;
  }
  delete s.raidBackup;
  s.stock = {};
  const kept = r.success || s.mode === "easy";
  s.buyback = [];
  if (!kept) {
    s.buyback = [
      ...s.pack,
      ...Object.values(s.equipment).filter((x): x is Item => !!x),
    ].map((x) => ({ ...x, uid: crypto.randomUUID() }));
    s.pack = [];
    s.equipment = {
      primary: null,
      secondary: null,
      armor: null,
      helmet: null,
      bag: null,
      ammo: null,
      melee: makeItem("k0"),
      food: null,
    };
  } else if (!r.success) {
    // Easy-mode death keeps its original return-to-stash rule; successful raids keep the backpack.
    for (const item of s.pack) {
      put(s.stash, item, Infinity);
    }
    s.pack = [];
  }
  if (r.success) {
    s.stats.extracts++;
    for (const id of r.bosses) {
      if (!s.defeated.includes(id)) {
        s.defeated.push(id);
        s.coins +=
          id === "doctor"
            ? 30000
            : id === "maine" || id === "frost"
              ? 12000
              : mapsReward(r.map);
      }
    }
    s.coins += r.reward;
    if (
      s.defeated.includes("doctor") &&
      bosses.every((b) => s.defeated.includes(b.id))
    )
      s.completed = true;
  } else s.stats.deaths++;
  s.stats.kills += r.kills;
  s.stats.time += r.time;
  s.stats.value += r.value;
  s.result = r;
  normalizeAmmo(s.pack);
  normalizeAmmo(s.stash);
  persist(s);
  return true;
}
const mapsReward = (m: number) => [4000, 7500, 12000, 20000][m];
export function cancelRaid(s: Save) {
  if (!s.pending || !s.raidBackup) return false;
  try {
    const raw = JSON.parse(s.raidBackup);
    if (raw.raidBackup !== undefined) return false;
    const restored = validateSave(raw),
      settings = s.settings;
    for (const k of Object.keys(s))
      delete (s as unknown as Record<string, unknown>)[k];
    Object.assign(s, restored, { settings });
    persist(s);
    return true;
  } catch {
    return false;
  }
}
export function recoverInterrupted(s: Save) {
  if (s.pending) {
    settle(s, {
      success: false,
      reason: "上次出击中断，已按死亡规则安全结算",
      map: s.pendingMap ?? 0,
      kills: 0,
      searches: 0,
      value: 0,
      time: 0,
      damageDealt: 0,
      damageTaken: 0,
      bosses: [],
      reward: 0,
    });
  }
}
export function rescue(s: Save) {
  if (
    s.coins >= 1000 ||
    s.equipment.primary ||
    s.stash.some((i) => db[i.id].kind === "weapon")
  )
    return false;
  s.equipment.primary = makeItem("w0");
  s.equipment.armor = makeItem("a1");
  for (const i of [makeItem("m1", 30), makeItem("f1")]) {
    if (canPut(s.pack, i, packCapacity(s))) put(s.pack, i, packCapacity(s));
    else put(s.stash, i, Infinity);
  }
  persist(s);
  return true;
}
