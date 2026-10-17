import Phaser from "phaser";
import "./app.css";
import {
  db,
  collectibles,
  foodEffect,
  itemNameColor,
  items,
  maps,
  bosses,
  colors,
  rarity,
  capacities,
  warehouseCosts,
  safeCap,
  safeNames,
  safePrice,
  kindNames,
  makeItem,
  sale,
  searchTime,
  type Item,
  protection,
  AMMO_STACK,
  BASE_PACK,
  EXTRACT_SECONDS,
  MOVEMENT,
  weaponDamageScale,
  weaponClassNames,
} from "./data";
import {
  initDB,
  load,
  newSave,
  newTestingSave,
  persist,
  saveIssue,
  unlocked,
  packCapacity,
  move,
  equip,
  buy,
  buyBack,
  sell,
  upgradeWarehouse,
  upgradeSafe,
  repair,
  repairCost,
  stashAll,
  swapWeaponSlots,
  rescue,
  recoverInterrupted,
  validateSave,
  canPut,
  put,
  normalizeAmmo,
  type Save,
  type Result,
  type Equipment,
} from "./store";
import { icon, itemIcon } from "./art";
import { Sound } from "./audio";
import { Raid } from "./raid";
import { Renderer, miniMap } from "./render";
import { ThreeRenderer } from "./three-render";

const root = document.querySelector<HTMLDivElement>("#ui")!,
  canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const gameMenu = document.createElement("dialog");
gameMenu.id = "game-menu";
document.body.append(gameMenu);
const baseMenu = document.createElement("dialog");
baseMenu.id = "base-menu";
document.body.append(baseMenu);
const collectionDialog = document.createElement("dialog");
collectionDialog.id = "collection-dialog";
document.body.append(collectionDialog);
const resultDialog = document.createElement("dialog");
resultDialog.id = "result-dialog";
document.body.append(resultDialog);
resultDialog.addEventListener("cancel", (e) => e.preventDefault());
const discoveryFeed = document.createElement("aside");
discoveryFeed.id = "discovery-feed";
discoveryFeed.setAttribute("aria-live", "polite");
discoveryFeed.setAttribute("aria-atomic", "true");
document.body.append(discoveryFeed);
let discoveryQueue: Item[] = [],
  activeDiscovery: Item | undefined,
  discoveryTimer: ReturnType<typeof setTimeout> | undefined;
function clearDiscoveries() {
  clearTimeout(discoveryTimer);
  discoveryQueue = [];
  activeDiscovery = undefined;
  discoveryFeed.innerHTML = "";
}
function nextDiscovery() {
  clearTimeout(discoveryTimer);
  discoveryQueue.sort((a, b) => db[b.id].tier - db[a.id].tier);
  activeDiscovery = discoveryQueue.shift();
  if (!activeDiscovery) {
    discoveryFeed.innerHTML = "";
    return;
  }
  const d = db[activeDiscovery.id],
    color = itemNameColor(d.id) || colors[d.tier];
  const headline = [
    "",
    "",
    "",
    "好家伙，捡到宝了！",
    "壕！这下真的壕！",
    "哇！金色传说！",
  ][d.tier];
  discoveryFeed.innerHTML = `<section class="discovery-card tier-${d.tier}" data-item="${d.id}" style="--discovery-color:${color}">${d.tier >= 3 ? `<h2>${headline}</h2><p class="discovery-description">${esc(d.desc)}</p>` : ""}<strong class="discovery-name">首次解锁 <span style="color:${color}">${esc(d.name)}</span></strong></section>`;
  const expire = () => {
    if (raid?.paused) {
      discoveryTimer = setTimeout(expire, 1000);
      return;
    }
    nextDiscovery();
  };
  discoveryTimer = setTimeout(
    expire,
    [0, 1000, 1500, 3500, 4500, 6000][d.tier],
  );
}
function showDiscovery(item: Item) {
  if (db[item.id].kind !== "collectible") return;
  discoveryQueue.push({ ...item });
  if (!activeDiscovery) nextDiscovery();
  else if (db[item.id].tier > db[activeDiscovery.id].tier) {
    discoveryQueue.push(activeDiscovery);
    nextDiscovery();
  }
}
function unknownCollectible() {
  return `<span class="item-art unknown-collectible" data-art="unknown" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M20 20c0-15 26-15 26 0 0 9-14 10-14 20"/><circle cx="32" cy="51" r="2"/></svg></span>`;
}
function collectibleDetail(id: string) {
  const d = db[id];
  return `${heading(`<span style="color:${itemNameColor(id)}">${esc(d.name)}</span>`)}<div class="collection-detail-art">${itemIcon({ id, uid: id, qty: 1 }, 160)}</div><p style="color:${itemNameColor(id)}">${rarity[d.tier]}</p><p class="collection-description">${esc(d.desc)}</p><p>出售价值 ◈ ${money(Math.floor(d.price * 0.65))} 金币</p>`;
}
function syncCollectionDialog() {
  const id = modal.startsWith("collection:") ? modal.slice(11) : "";
  const visible =
    !title &&
    !raid &&
    db[id]?.kind === "collectible" &&
    s.collection.includes(id);
  setDialog(
    collectionDialog,
    visible
      ? `<section class="modal panel collection-modal">${btn("×", "close-modal", 'aria-label="关闭"', "close")}${collectibleDetail(id)}</section>`
      : "",
  );
}
function setDialog(dialog: HTMLDialogElement, content: string) {
  if (!content) {
    if (dialog.open) dialog.close();
    dialog.removeAttribute("open");
    dialog.innerHTML = "";
    return;
  }
  dialog.innerHTML = content;
  if (!dialog.open) {
    try {
      dialog.showModal();
    } catch {
      // A failed native modal must still leave a visible, usable menu.
      dialog.setAttribute("open", "");
    }
  }
}
function syncGameMenu() {
  setDialog(gameMenu, raid && !raid.done && raid.paused ? raidOverlay() : "");
}
function syncBaseMenu() {
  let content = "";
  if (!title && ["base-menu", "base-settings", "base-help"].includes(modal)) {
    content =
      modal === "base-menu"
        ? `<h1>基地菜单</h1>${btn("返回开始界面", "to-title", "", "secondary full")}${btn("设置", "base-settings", "", "secondary full")}${btn("操作指南", "base-help", "", "secondary full")}${btn("继续整备", "close-modal", "", "primary full")}`
        : modal === "base-settings"
          ? `${heading("设置")}${settingsContent()}${btn("返回基地菜单", "settings", "", "secondary full")}`
          : `${guide()}${btn("返回基地菜单", "settings", "", "secondary full")}`;
    content = `<section class="modal pause-modal panel">${btn("×", "close-modal", 'aria-label="关闭"', "close")}${content}</section>`;
  }
  setDialog(baseMenu, content);
}
for (const dialog of [gameMenu, baseMenu, collectionDialog])
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (dialog === gameMenu && raid) {
      raid.paused = false;
      overlay();
    } else {
      modal = "";
      render();
    }
  });
type Source = "stash" | "pack" | "secure" | "overflow";
type ItemSource = Source | "loot" | "equipment" | "shop";
let s: Save,
  sound: Sound,
  raid: Raid | undefined,
  flat: Renderer,
  volumeFrame = 0,
  scene3d: ThreeRenderer | undefined;
let slots: (Save | null)[] = [null, null, null],
  title = true,
  titlePage = "main",
  page = "base",
  category = "weapon",
  mapIndex = 0,
  modal = "",
  pausePage = "menu",
  newMode: "standard" | "easy" = "standard",
  newSlot = 0,
  newName = "三花七号",
  replaceSave = false,
  result: Result | undefined;
let selected: { from: ItemSource; uid: string } | undefined,
  filter = "all",
  sort = "type",
  weaponFilter = "all";
let menuAnchor = { x: 0, y: 0, left: 0 },
  hoverTimer: ReturnType<typeof setTimeout> | undefined;
function selectedItem() {
  if (!selected) return undefined;
  if (selected.from === "loot")
    return raid?.search?.items
      .slice(0, raid.search.revealed)
      .find((i) => i.uid === selected!.uid);
  if (selected.from === "equipment")
    return (
      Object.values(s.equipment).find((i) => i?.uid === selected!.uid) ||
      undefined
    );
  if (selected.from === "shop")
    return db[selected.uid]
      ? {
          id: selected.uid,
          uid: selected.uid,
          qty: 1,
          ...(db[selected.uid].durability
            ? {
                durability: db[selected.uid].durability,
                maxDurability: db[selected.uid].durability,
              }
            : {}),
        }
      : undefined;
  return s[selected.from].find((i) => i.uid === selected!.uid);
}
const keys = new Set<string>(),
  mouse = { x: 0, y: 0, down: false },
  pointer = { x: innerWidth / 2, y: innerHeight / 2 };
const money = (v: number) => Math.floor(v).toLocaleString("zh-CN");
const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const name = (id: string) => db[id].name;
const btn = (label: string, action: string, attrs = "", cls = "") =>
  `<button class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const heading = (text: string, meta = "") =>
  `<div class="panel-heading"><h2>${text}</h2>${meta ? `<span>${meta}</span>` : ""}</div>`;
const emptySlots = (n: number) =>
  Array.from(
    { length: Math.max(0, n) },
    () => '<div class="empty-slot" aria-label="空格"></div>',
  ).join("");
function toast(message: string) {
  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;
  const target = document.querySelector("#toasts")!;
  target.append(box);
  while (target.children.length > 4) target.firstElementChild!.remove();
  setTimeout(() => box.remove(), 3500);
}
function logo(large = false) {
  return `<div class="logo ${large ? "large-logo" : ""}"><svg viewBox="0 0 120 105" aria-hidden="true"><path d="M60 5 114 96H6Z" fill="#c7b57e"/><path d="M31 65V29l24 15h10l24-15v36c0 32-58 32-58 0" fill="#263d30"/><path d="m41 62 10 3m18 0 10-3M55 76l5 4 5-4" fill="none" stroke="#ebd29a" stroke-width="5" stroke-linecap="round"/></svg><strong>三角猫行动</strong></div>`;
}
function card(i: Item, from: string, shop = false) {
  const d = db[i.id],
    chosen = selected?.uid === i.uid,
    locked = shop && unlocked(s) < (d.unlock ?? 0);
  return `<button class="item-slot ${chosen ? "selected" : ""}" style="--rarity:${colors[d.tier]}" data-action="${shop ? "buy" : from === "loot" ? "loot-select" : "select"}" data-id="${shop ? i.id : i.uid}" data-from="${from}" data-item="${i.id}" ${shop ? "" : 'draggable="true"'} ${locked ? "disabled" : ""}><span class="quality">${rarity[d.tier]}</span>${itemIcon(i, 52)}<strong style="color:${itemNameColor(i.id) || "inherit"}">${name(i.id)}</strong><span class="${["food", "ammo"].includes(d.kind) ? "stack-quantity" : ""}">${shop ? (locked ? "尚未解锁" : `◈ ${money(d.price)}`) : d.kind === "ammo" ? `${i.qty} 发` : d.kind === "food" ? `${i.qty} 份` : i.durability !== undefined ? `${Math.ceil(i.durability)}/${Math.ceil(i.maxDurability!)}` : d.kind === "collectible" ? `◈ ${money(sale(i))}` : kindNames[d.kind]}</span>${shop ? `<small>${d.damage ? `伤害 ${d.damage}${d.pellets! > 1 ? `×${d.pellets}` : ""} · 弹匣 ${d.mag}` : d.capacity ? `${d.capacity} 格` : d.kind === "food" ? foodEffect(d) : d.kind === "ammo" ? "每组 90 发" : `${d.tier} 级防护`}</small>` : ""}</button>`;
}
function remember() {
  if (s.temporary) return;
  persist(s);
  if (!s.temporary) slots[s.slot] = structuredClone(s);
}
async function refreshSlots() {
  slots = await Promise.all([0, 1, 2].map((i) => load(i)));
}
function settingsContent(inRaid = false) {
  const cycle =
    !inRaid && !title && s.completed
      ? btn("开启九命周目", "next-cycle", "", "secondary full")
      : "";
  return `${cycle}<div class="settings-controls">${heading("声音与画面")}${[
    ["master", "主音量"],
    ["music", "背景音乐"],
    ["sfx", "音效"],
    ["shake", "屏幕震动"],
  ]
    .map(
      ([key, label]) =>
        `<label><span>${label}</span><input aria-label="${label}" type="range" min="0" max="1" step="0.05" value="${s.settings[key as "master"]}" data-setting="${key}"/><output>${Math.round(s.settings[key as "master"] * 100)}%</output></label>`,
    )
    .join(
      "",
    )}<label><span>准星颜色</span><input aria-label="准星颜色" type="color" value="${s.settings.aim}" data-setting="aim"/></label></div>${!inRaid && !title && !s.temporary ? `<div class="save-tools">${heading("存档管理")}<div class="button-row">${btn("导出存档", "export", "", "secondary")}<label class="button secondary">导入存档<input id="import-save" type="file" accept=".json,application/json" hidden/></label></div><p>存档保存在当前浏览器，可导出备份。</p>${btn("返回开始界面", "to-title", "", "secondary full")}</div>` : ""}`;
}
function guide() {
  return `${heading("操作指南")}<div class="guide-grid">${[
    ["W A S D", "疾跑（持刀更快）"],
    ["空格", "翻滚"],
    ["鼠标左键", "瞄准与射击"],
    ["R", "换弹"],
    ["E", "开关容器与背包"],
    ["F", "食物回血"],
    ["Tab", "打开背包"],
    ["M", "打开地图"],
    ["1 / 2 / 3", "主武器／副武器／近战"],
    ["Esc", "关闭窗口／游戏菜单"],
  ]
    .map(([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`)
    .join(
      "",
    )}</div><ul class="guide-rules"><li>容器直接打开，物品按价值逐件搜索。</li><li>双击已搜索物品拾取；更强头甲自动替换，旧装备留在容器。</li><li>绿色圈为撤离点，连续停留三秒撤离。</li><li>背包、地图和搜索窗口不会暂停战斗。</li><li>暂停后选择退出本局，会恢复出击前状态。</li></ul>`;
}
function titleScreen() {
  let content = "";
  if (titlePage === "main")
    content = `${logo(true)}<div class="title-options">${btn("开始游戏", "title-new", "", "primary")}${btn("读取存档", "title-load", "", "secondary")}${btn("设置", "title-settings", "", "secondary")}</div>`;
  if (titlePage === "new")
    content = `${logo()}<h1>开始游戏</h1><div class="mode-picker">${btn("<strong>标准模式</strong><span>死亡掉落，安全箱保留</span>", "new-mode", 'data-id="standard"', newMode === "standard" ? "selected" : "")}${btn("<strong>轻松模式</strong><span>死亡保留所有物品</span>", "new-mode", 'data-id="easy"', newMode === "easy" ? "selected" : "")}</div><label class="name-field">干员名字<input id="new-name" value="${esc(newName)}" maxlength="24"/></label><div class="slot-picker">${slots.map((slot, i) => btn(`存档 ${i + 1}<span>${slot ? esc(slot.name) : "空存档"}</span>`, "new-slot", `data-id="${i}"`, newSlot === i ? "selected" : "")).join("")}</div>${replaceSave ? '<p class="warning-text">此位置已有存档，再次点击会替换。请先导出需要保留的存档。</p>' : ""}${btn(replaceSave ? "替换存档并进入基地" : "创建并进入基地", "create", "", "primary full")}${btn("返回", "title-main", "", "secondary full")}`;
  if (titlePage === "load")
    content = `${logo()}<h1>读取存档</h1><div class="save-list">${slots.map((slot, i) => `<div class="save-row"><div><strong>存档 ${i + 1}${slot ? ` · ${esc(slot.name)}` : ""}</strong><span>${slot ? `${slot.mode === "standard" ? "标准模式" : "轻松模式"} · ◈ ${money(slot.coins)} · 首领 ${slot.defeated.length}/6` : "空存档"}</span></div>${btn("读取", "load-slot", `data-id="${i}" ${!slot ? "disabled" : ""}`, "secondary")}</div>`).join("")}</div>${btn("返回", "title-main", "", "secondary full")}`;
  if (titlePage === "settings")
    content = `${heading("设置")}${settingsContent()}${btn("返回", "title-main", "", "secondary full")}`;
  return `<main class="title-screen"><section class="title-card ${titlePage === "main" ? "title-main" : ""}">${content}</section>${titlePage === "main" ? btn("·", "test-entry", 'aria-label="临时测试入口"', "test-entry") : ""}</main>`;
}
function header() {
  return `<header class="base-header">${btn(logo(), "nav", 'data-id="base"', "logo-button")}<div class="header-state"><span>${esc(s.name)}</span><span>${s.temporary ? "临时测试 · 不保存" : s.mode === "standard" ? "标准模式" : "轻松模式"}</span><strong>◈ ${money(s.coins)}</strong></div><div class="header-actions">${btn("设置", "settings", "", "secondary")}${page !== "base" ? btn("返回基地", "nav", 'data-id="base"', "secondary") : btn("开始界面", "to-title", "", "secondary")}</div></header>`;
}
function dashboard() {
  return `<div class="base-tiles"><section class="base-tile base-summary">${icon("paw", "#e4c890", 70)}<h1>暖窝基地</h1><div class="summary-stats"><div><strong>${s.defeated.length}/6</strong><span>主线首领</span></div><div><strong>${s.stats.extracts}</strong><span>成功撤离</span></div><div><strong>${s.collection.length}/${collectibles.length}</strong><span>物品收藏</span></div></div>${btn("进入地图一", "quick-deploy", "", "primary")}</section>${[
    [
      "loadout",
      "仓库与整备",
      "bag",
      `${s.stash.length}/${capacities[s.warehouse]} 格`,
    ],
    ["shop", "补给商店", "box", ""],
    ["maps", "战区地图", "map", ""],
    [
      "collection",
      "收藏图鉴",
      "gem",
      `${s.collection.length}/${collectibles.length}`,
    ],
  ]
    .map(([id, label, i, info]) =>
      btn(
        `${icon(i, "#c5c89a", 74)}<h2>${label}</h2>${info ? `<span>${info}</span>` : ""}`,
        "nav",
        `data-id="${id}" aria-label="${label}"`,
        "base-tile",
      ),
    )
    .join("")}</div>`;
}
function equipped() {
  return `<div class="equipped-grid" aria-label="当前装备">${(
    [
      ["primary", "主武器", "rifle"],
      ["secondary", "副武器", "smg"],
      ["armor", "护甲", "armor"],
      ["helmet", "头盔", "helmet"],
      ["bag", "背包", "bag"],
      ["ammo", "子弹", "ammo"],
      ["melee", "近战武器", "sword"],
    ] as const
  )
    .map(([slot, label, ic]) => {
      const i = s.equipment[slot];
      return `<div class="equipped-slot" data-drop="equipment" data-slot="${slot}" aria-label="${label}装备位"><span class="equipment-title">${label}</span><button class="equipped-item" data-action="select" data-from="equipment" data-item="${i?.id || ""}" data-id="${i?.uid || ""}" ${i ? 'draggable="true"' : "disabled"}>${i ? itemIcon(i, 32) : icon(ic, "#7c917b", 32)}<strong>${i ? name(i.id) : "未装备"}</strong>${slot === "ammo" ? `<span>${i?.qty ?? 0} 发备弹</span><span>弹匣 ${raid?.mag ?? s.equipment.primary?.loaded?.count ?? 0} 发</span>` : ""}${i?.durability !== undefined ? `<span>耐久 ${Math.ceil(i.durability)}/${Math.ceil(i.maxDurability!)}</span>` : ""}</button></div>`;
    })
    .join("")}</div>`;
}
function inventoryPanel() {
  return `<section class="panel inventory-panel" aria-label="左侧背包"><div class="equipment-fixed">${heading("当前装备")}${equipped()}</div><div class="pack-heading">${heading("背包", `${s.pack.length}/${packCapacity(s)} 格`)}${!raid ? btn("全部放回", "stash-all", s.pack.length ? "" : "disabled", "secondary") : ""}</div><div class="inventory-scroll" data-drop="pack"><div class="slot-grid pack-grid" data-grid="pack">${s.pack.map((i) => card(i, "pack")).join("")}${emptySlots(packCapacity(s) - s.pack.length)}</div></div><div class="safe-fixed" data-drop="secure"><div class="safe-label"><strong>${safeNames[s.safe]}（安全箱）</strong>${!raid ? btn("升级", "safe-menu", "", "secondary") : `<span>${s.secure.length}/${safeCap[s.safe]} 格</span>`}</div><div class="slot-grid safe-grid" data-grid="secure" style="--safe-slots:${safeCap[s.safe]}">${s.secure.map((i) => card(i, "secure")).join("")}${emptySlots(safeCap[s.safe] - s.secure.length)}</div></div></section>`;
}
function selectedActions() {
  const i = selectedItem();
  if (!i || !selected) return "";
  const d = db[i.id],
    f = selected.from,
    gear = ["weapon", "armor", "helmet", "bag", "ammo", "melee"].includes(
      d.kind,
    );
  let options = "";
  if (f === "shop")
    options = btn(
      `购买 ◈ ${money(d.price)}`,
      "purchase-selected",
      "",
      "item-option",
    );
  else if (f === "equipment") {
    if (!raid)
      options =
        btn(
          "卸下至仓库",
          "unequip",
          `data-id="${Object.entries(s.equipment).find(([, v]) => v?.uid === i.uid)?.[0]}"`,
          "item-option",
        ) +
        (d.durability
          ? btn(
              `修复 ◈ ${repairCost(i)}`,
              "repair",
              `data-id="${i.uid}"`,
              "item-option",
            )
          : "");
  } else {
    if (f === "loot")
      options += btn("放入背包", "take-selected", "", "item-option");
    else if (f !== "pack")
      options += btn("放入背包", "move", 'data-to="pack"', "item-option");
    if (gear)
      options +=
        btn("装备", "equip", "", "item-option") +
        (d.kind === "weapon"
          ? btn("装备副武器", "equip-secondary", "", "item-option")
          : "");
    if (raid && d.kind === "food" && (f === "pack" || f === "loot"))
      options += btn("食用", "eat", `data-id="${i.uid}"`, "item-option");
    if (raid && d.kind === "ammo" && f === "pack")
      options += btn("装填", "ammo", `data-id="${d.tier}"`, "item-option");
    if (raid && f !== "secure")
      options += btn("放入安全箱", "move", 'data-to="secure"', "item-option");
    if (!raid && f !== "stash")
      options += btn("放入仓库", "move", 'data-to="stash"', "item-option");
    if (!raid && (f === "stash" || f === "overflow" || f === "pack"))
      options += btn(`出售 ◈ ${money(sale(i))}`, "sell", "", "item-option");
    if (raid && f === "pack")
      options += btn("丢弃", "drop", `data-id="${i.uid}"`, "item-option");
  }
  if (!raid && (f === "stash" || f === "pack") && d.durability)
    options += btn(
      `修复 ◈ ${repairCost(i)}`,
      "repair",
      `data-id="${i.uid}"`,
      "item-option",
    );
  const spec =
    d.kind === "weapon"
      ? `${weaponClassNames[d.weaponClass!]} · ${d.pellets! > 1 ? `伤害 ${d.damage}×${d.pellets} 弹丸` : `伤害 ${d.damage}`} · 弹匣 ${d.mag} · 射速 ${d.rpm} 发／分 · 射程 ${d.range}`
      : d.kind === "bag"
        ? `容量 ${d.capacity} 格`
        : d.kind === "food"
          ? `${foodEffect(d)} · 食用 ${d.useTime} 秒${d.healOverTime ? "；持续效果不叠加，食用新的持续补给会刷新效果" : ""}`
          : d.kind === "ammo"
            ? `${d.tier} 级弹药 · 每组最多 90 发`
            : "";
  return `<h3 style="color:${itemNameColor(i.id) || "inherit"}">${esc(name(i.id))}</h3><span style="color:${colors[d.tier]}">${rarity[d.tier]} · ${kindNames[d.kind]}</span><p class="item-description">${esc(d.desc)}</p><p class="item-sale-value">出售价值 ◈ ${money(sale(i))} 金币</p>${d.kind === "weapon" ? `<p>耐久 ${Math.ceil(i.durability ?? d.durability!)}/${Math.ceil(i.maxDurability ?? d.durability!)} · 威力 ${Math.round(weaponDamageScale(i.durability ?? d.durability!) * 100)}%</p>` : ""}${spec ? `<p>${spec}</p>` : ""}${d.kind === "armor" || d.kind === "helmet" ? `<p>防护评分 ${Math.round(protection(i))}（等级×剩余耐久）</p>` : ""}<div class="item-options">${options}</div>`;
}
function closeItemMenu() {
  document.querySelector("#item-menu")?.remove();
  document.querySelector("#item-tooltip")?.remove();
  selected = undefined;
}
function openItemMenu(el: HTMLElement) {
  if (!el.dataset.id) return;
  const rect = el.getBoundingClientRect();
  menuAnchor = { x: rect.right + 8, y: rect.top, left: rect.left };
  selected = { from: el.dataset.from as ItemSource, uid: el.dataset.id };
  refreshItemMenu();
}
function refreshItemMenu() {
  document.querySelector("#item-menu")?.remove();
  document.querySelector("#item-tooltip")?.remove();
  const content = selectedActions();
  if (!content) return;
  const menu = document.createElement("section");
  menu.id = "item-menu";
  menu.className = "panel item-menu";
  menu.setAttribute("aria-label", "物品操作");
  menu.innerHTML = content;
  root.append(menu);
  const rect = menu.getBoundingClientRect();
  const menuX =
    menuAnchor.x + rect.width < innerWidth - 12
      ? menuAnchor.x
      : menuAnchor.left - rect.width - 8;
  menu.style.left = `${Math.max(12, menuX)}px`;
  menu.style.top = `${Math.max(12, Math.min(menuAnchor.y, innerHeight - rect.height - 12))}px`;
}
function equipSelected(slot?: keyof Equipment) {
  const i = selectedItem();
  if (!i || !selected) return false;
  const kind = db[i.id].kind;
  if (
    slot &&
    !(["primary", "secondary"].includes(slot)
      ? kind === "weapon"
      : kind === slot)
  )
    return false;
  let ok = false;
  if (
    selected.from === "equipment" &&
    kind === "weapon" &&
    (slot === "primary" || slot === "secondary")
  ) {
    const from = Object.entries(s.equipment).find(
      ([, item]) => item?.uid === i.uid,
    )?.[0];
    if (from === "primary" || from === "secondary")
      ok =
        from === slot ||
        (raid ? raid.swapWeapons(from, slot) : swapWeaponSlots(s, from, slot));
  } else if (selected.from === "loot")
    ok = raid?.equipContainer(i.uid, slot) ?? false;
  else if (selected.from !== "equipment" && selected.from !== "shop") {
    if (raid && selected.from === "pack")
      ok = raid.equipLoot(i.uid, slot === "secondary");
    else if (!raid || kind !== "weapon")
      ok = equip(s, selected.from, i.uid, slot === "secondary");
  }
  if (!ok) toast("无法装备，请检查装备类型和背包空间");
  closeItemMenu();
  if (raid) overlay();
  else render();
  return ok;
}
function warehouse() {
  let list = [...s.stash];
  if (filter !== "all") list = list.filter((i) => db[i.id].kind === filter);
  list.sort((a, b) =>
    sort === "value"
      ? sale(b) - sale(a)
      : sort === "type"
        ? [
            "weapon",
            "armor",
            "helmet",
            "bag",
            "ammo",
            "food",
            "melee",
            "collectible",
          ].indexOf(db[a.id].kind) -
            [
              "weapon",
              "armor",
              "helmet",
              "bag",
              "ammo",
              "food",
              "melee",
              "collectible",
            ].indexOf(db[b.id].kind) || sale(b) - sale(a)
        : db[b.id].tier - db[a.id].tier || sale(b) - sale(a),
  );
  return `<div class="inventory-layout">${inventoryPanel()}<section class="panel warehouse-panel" data-drop="stash" aria-label="右侧仓库">${heading("仓库", `${s.stash.length}/${capacities[s.warehouse]} 格`)}<div class="warehouse-tools"><select id="filter" aria-label="物品分类"><option value="all">全部物品</option>${Object.entries(
    kindNames,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${filter === k ? "selected" : ""}>${v}</option>`,
    )
    .join(
      "",
    )}</select><select id="sort" aria-label="排序"><option value="type" ${sort === "type" ? "selected" : ""}>按类型</option><option value="tier" ${sort === "tier" ? "selected" : ""}>按品质</option><option value="value" ${sort === "value" ? "selected" : ""}>按价值</option></select>${btn("出售收集品", "sell-all", "", "secondary")}${btn(s.warehouse < 4 ? `扩容 ◈ ${money(warehouseCosts[s.warehouse + 1])}` : "已满级", "warehouse", s.warehouse >= 4 ? "disabled" : "", "secondary")}</div><div class="warehouse-scroll"><div class="slot-grid warehouse-grid" data-grid="stash">${list.map((i) => card(i, "stash")).join("")}${Array.from({ length: s.stash.length - list.length }, () => '<div class="filtered-slot" aria-label="筛选隐藏的物品">已占用</div>').join("")}${emptySlots(capacities[s.warehouse] - s.stash.length)}</div></div></section></div>`;
}
function shop() {
  const products = items.filter((d) =>
    category === "armor"
      ? ["armor", "helmet", "bag"].includes(d.kind)
      : d.kind === category &&
        (category !== "weapon" ||
          weaponFilter === "all" ||
          d.weaponClass === weaponFilter),
  );
  if (category === "food") products.sort((a, b) => a.price - b.price);
  else if (category === "weapon")
    products.sort((a, b) => a.tier - b.tier || a.price - b.price);
  return `<div class="shop-layout"><aside class="panel shop-categories">${heading("补给商店")}${[
    ["weapon", "武器"],
    ["armor", "护具与背包"],
    ["ammo", "子弹"],
    ["food", "食物"],
  ]
    .map(([id, label]) =>
      btn(
        label,
        "category",
        `data-id="${id}"`,
        category === id ? "selected" : "",
      ),
    )
    .join(
      "",
    )}${btn("领取救济包", "rescue", "", "secondary")}</aside><section class="panel shop-products">${heading("商品", "回收比例 65%")}${
    category === "weapon"
      ? `<label class="weapon-filter">枪械类型<select id="weapon-filter" aria-label="枪械类型"><option value="all">全部枪械</option>${Object.entries(
          weaponClassNames,
        )
          .map(
            ([key, label]) =>
              `<option value="${key}" ${weaponFilter === key ? "selected" : ""}>${label}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }<div class="slot-grid shop-grid">${products.map((d) => card({ uid: d.id, id: d.id, qty: d.kind === "ammo" ? AMMO_STACK : 1 }, "shop", true)).join("")}</div>${
    s.buyback.filter((i) => db[i.id].kind !== "collectible").length
      ? `<div class="buyback">${heading("死亡物品回购")}<div class="slot-grid">${s.buyback
          .filter((i) => db[i.id].kind !== "collectible")
          .map(
            (i) =>
              `<div class="buyback-item">${itemIcon(i, 44)}<strong>${name(i.id)}</strong>${btn(`购买 ◈ ${money(Math.ceil(db[i.id].price * (db[i.id].kind === "ammo" ? i.qty / AMMO_STACK : db[i.id].kind === "food" ? i.qty : 1)))}`, "buyback", `data-id="${i.uid}"`, "secondary")}</div>`,
          )
          .join("")}</div></div>`
      : ""
  }</section></div>`;
}
function mapsPage() {
  return `<section class="maps-section">${heading("战区地图")}<div class="map-cards">${maps.map((m, i) => btn(`${icon("map", i === mapIndex ? "#e3c58b" : "#98b08f", 70)}<h2>${m.name}</h2><span>${i > unlocked(s) ? "尚未解锁" : i === 0 ? "推荐 1 级装备" : `推荐 ${i + 1} 级装备`}</span>`, "map-select", `data-id="${i}"`, "map-card " + (i === mapIndex ? "selected" : ""))).join("")}</div><section class="panel mission-panel">${heading(maps[mapIndex].name)}<div class="mission-info"><span>限时 15 分钟</span><span>撤离需 3 秒</span><span>付费撤离 ◈ ${money(maps[mapIndex].fee)}</span></div><div class="boss-list">${bosses
    .filter((b) => b.map === mapIndex)
    .map(
      (b) => `<span>${s.defeated.includes(b.id) ? "✓" : "◇"} ${b.name}</span>`,
    )
    .join(
      "",
    )}</div><div class="button-row">${btn("查看整备", "nav", 'data-id="loadout"', "secondary")}${btn("开始行动", "deploy", mapIndex > unlocked(s) || (!s.equipment.primary && !s.equipment.melee) ? "disabled" : "", "primary")}</div>${!s.equipment.primary && !s.equipment.melee ? '<p class="warning-text">请先装备武器。</p>' : ""}</section></section>`;
}
function collection() {
  return `<section>${heading("收藏图鉴", `${s.collection.length}/${collectibles.length}`)}${[
    1, 2, 3, 4, 5,
  ]
    .map(
      (t) =>
        `<section class="collection-section">${heading(rarity[t])}<div class="collection-grid">${items
          .filter((d) => d.kind === "collectible" && d.tier === t)
          .map(
            (d) =>
              `<button class="collection-item ${s.collection.includes(d.id) ? "found" : ""}" data-action="collection-detail" data-id="${d.id}" ${s.collection.includes(d.id) ? `data-item="${d.id}"` : "disabled"}>${s.collection.includes(d.id) ? itemIcon({ id: d.id, uid: d.id, qty: 1 }, 80) : unknownCollectible()}<strong style="color:${itemNameColor(d.id)}">${name(d.id)}</strong>${s.collection.includes(d.id) ? `<span>已发现 · ◈ ${money(Math.floor(d.price * 0.65))}</span>` : ""}</button>`,
          )
          .join("")}</div></section>`,
    )
    .join("")}</section>`;
}
function render() {
  if (!s) return;
  if (raid && !raid.done) {
    renderRaid();
    return;
  }
  syncGameMenu();
  scene3d?.show(false);
  canvas.classList.add("hidden");
  document.body.classList.remove("in-raid");
  syncBaseMenu();
  syncCollectionDialog();
  setDialog(resultDialog, !title && result ? resultModal(result) : "");
  if (title) {
    root.innerHTML = titleScreen();
    return;
  }
  root.innerHTML =
    header() +
    `<main class="base-main ${page === "loadout" ? "inventory-page" : ""}">${page === "base" ? dashboard() : page === "loadout" ? warehouse() : page === "shop" ? shop() : page === "maps" ? mapsPage() : page === "collection" ? collection() : `<section class="panel settings-panel">${settingsContent()}</section>`}</main>` +
    baseModal();
}
function baseModal() {
  if (result) return "";
  if (
    !modal ||
    modal.startsWith("collection:") ||
    ["base-menu", "base-settings", "base-help"].includes(modal)
  )
    return "";
  let content =
    modal === "help"
      ? guide()
      : modal === "safe"
        ? `${heading("升级安全箱")}<div class="safe-options">${safeNames.map((n, i) => btn(`${icon("safe", "#d8bf88", 54)}<strong>${n}</strong><span>${safeCap[i]} 格</span><span>${i <= s.safe ? "已拥有" : i === 3 && !s.defeated.includes("yeed") ? "击败猫伊德后解锁" : `◈ ${money(safePrice[i])}`}</span>`, "safe", `data-id="${i}" ${i <= s.safe || (i === 3 && !s.defeated.includes("yeed")) ? "disabled" : ""}`)).join("")}</div>`
        : modal === "settings"
          ? settingsContent()
          : "";
  return `<div class="modal-backdrop"><section class="modal panel">${btn("×", "close-modal", 'aria-label="关闭"', "close")}${content}</section></div>`;
}
function resultModal(r: Result) {
  return `<section class="modal result-panel panel"><h1>${s.completed && r.bosses.includes("doctor") ? "行动完成" : r.success ? "成功撤离" : "行动失败"}</h1><p>${esc(r.reason)}</p><div class="result-stats">${[
    ["击败敌人", r.kills],
    ["搜索容器", r.searches],
    [
      "带出物资价值",
      `◈ ${money(r.success || s.mode === "easy" ? r.value : 0)}`,
    ],
    ["用时", `${Math.floor(r.time / 60)}分${Math.floor(r.time % 60)}秒`],
  ]
    .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
    .join(
      "",
    )}</div><p>${r.success ? "背包物品已保留，请自行整理到仓库。" : s.mode === "easy" ? "轻松模式：物品全部保留。" : "标准模式：安全箱保留，其余出战物品丢失。"}</p>${btn(r.success ? `${r.value >= 20000 ? "一辈子花不完" : r.value > 0 ? "这波收获满满" : "好耶，猫回来了"}<small>（返回基地）</small>` : "回家，再来一局（返回基地）", "close-result", "", "primary full")}</section>`;
}
function renderRaid() {
  if (!raid) return;
  const r = raid;
  canvas.classList.remove("hidden");
  document.body.classList.add("in-raid");
  if (r.map !== 0) scene3d?.show(false);
  root.innerHTML = `<div class="raid-hud"><div class="raid-top"><strong>${maps[r.map].name}</strong><div id="boss-hud"></div>${btn('<b id="raid-time">15:00</b><span>菜单</span>', "pause", "", "raid-timer")}</div><canvas id="minimap" width="200" height="150" data-action="toggle-map" aria-label="打开战区地图"></canvas><div class="raid-bottom"><section class="vitals"><div><strong id="hp-number">100</strong><span>生命</span></div><div class="meter"><i id="hp-fill"></i></div><div class="stamina-row"><span>体力</span><strong id="st-number">${MOVEMENT.maxStamina}</strong><span id="sprint-state">疾跑</span></div><div class="meter stamina"><i id="st-fill"></i></div><span id="armor-readout"></span><span id="regen-readout"></span></section><div class="raid-shortcuts"><span>空格 翻滚</span><span>E 搜索</span><span>Tab 背包</span><span>M 地图</span></div><section class="weapon-hud"><div class="hud-weapon-column"><strong id="weapon-name"></strong><div id="weapon-art" class="hud-weapon-art" aria-hidden="true"></div><span id="weapon-condition"></span></div><div class="hud-ammo-column"><div class="hud-rounds"><b id="mag-count"></b><span id="reserve-count"></span></div><div class="hud-ammo-details"><span id="ammo-art" class="hud-ammo-art" aria-hidden="true"></span><span id="ammo-name"></span></div></div></section></div><div id="action-progress" class="action-progress hidden"></div><div id="crosshair"></div></div><div id="raid-overlay">${raidOverlay()}</div>`;
  overlay();
  updateHUD();
}
function raidOverlay() {
  if (!raid) return "";
  const r = raid;
  if (r.paused)
    return `<section class="modal pause-modal panel">${pausePage === "settings" ? `${settingsContent(true)}${btn("返回暂停菜单", "pause-menu", "", "secondary full")}` : pausePage === "help" ? `${guide()}${btn("返回暂停菜单", "pause-menu", "", "secondary full")}` : `<h1>游戏菜单</h1>${btn("继续游戏", "pause", "", "primary full")}${btn("设置", "pause-settings", "", "secondary full")}${btn("操作指南", "pause-help", "", "secondary full")}${btn("退出本局", "abort", "", "secondary full")}<p>恢复出击前状态，不带出本局物品。</p>`}</section>`;
  if (r.mapOpen)
    return `<div class="modal-backdrop"><section class="modal large-map panel">${heading(maps[r.map].name, "绿色：撤离点　橙色：首领")}<canvas id="full-map" width="960" height="720"></canvas>${btn("关闭地图", "toggle-map", "", "secondary full")}</section></div>`;
  const bag = r.inventory || r.search || r.puzzle ? inventoryPanel() : "";
  let right = "";
  if (r.puzzle)
    right = `<section class="panel puzzle-panel">${btn("×", "close-search", 'aria-label="关闭容器"', "close")}${heading("保险箱")}<div class="math-expression">${r.puzzle.text}</div><div class="math-choices">${r.puzzle.choices.map((v, i) => btn(`<small>${i + 1}</small><strong>${v}</strong>`, "answer", `data-id="${v}"`)).join("")}</div><p>答错会锁定三秒并触发警报。</p></section>`;
  if (r.search)
    right = `<section class="panel loot-panel" aria-label="右侧容器">${btn("×", "close-search", 'aria-label="关闭容器"', "close")}${heading(r.search.name)}<div class="slot-grid loot-grid">${r.search.items.map((i, n) => (n < r.search!.revealed ? `<div class="loot-slot">${card(i, "loot")}</div>` : `<div class="unrevealed" data-search-index="${n}"><span class="search-ring ${n === r.search!.revealed ? "spinning" : ""}"></span><strong>${n === r.search!.revealed ? "搜索中" : "未搜索"}</strong></div>`)).join("")}${r.search.items.length ? "" : '<div class="empty-container">容器已清空</div>'}</div><div class="container-actions"><span>双击物品放入背包</span>${btn("拾取已搜索物品", "take-all", "", "secondary full")}</div></section>`;
  return bag || right
    ? `<div class="raid-inventory-layout">${bag}${right}</div>`
    : "";
}
function overlay() {
  syncGameMenu();
  if (raid && !raid.done && !document.querySelector("#raid-overlay"))
    renderRaid();
  const el = document.querySelector("#raid-overlay");
  if (el) el.innerHTML = raid?.paused ? "" : raidOverlay();
  if (selected && selectedItem()) refreshItemMenu();
  else closeItemMenu();
}
function updateHUD() {
  if (!raid || raid.done) return;
  const r = raid,
    p = r.p;
  const set = (id: string, value: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set(
    "raid-time",
    `${Math.floor(r.time / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(r.time % 60)
      .toString()
      .padStart(2, "0")}`,
  );
  set("hp-number", String(Math.max(0, Math.ceil(p.hp))));
  set("st-number", String(Math.ceil(p.stamina)));
  set(
    "sprint-state",
    p.exhausted ? "疲劳" : r.weapon?.kind === "melee" ? "持刀加速" : "疾跑",
  );
  set("weapon-name", r.weaponItem ? name(r.weaponItem.id) : "未装备武器");
  set("mag-count", String(r.mag).padStart(2, "0"));
  set("reserve-count", `/ ${r.reserve}`);
  set("ammo-name", r.reload ? "换弹中" : name(`m${r.ammoTier}`));
  const weaponArt = document.getElementById("weapon-art"),
    ammoArt = document.getElementById("ammo-art");
  if (weaponArt && weaponArt.dataset.artId !== (r.weaponItem?.id ?? "empty")) {
    weaponArt.dataset.artId = r.weaponItem?.id ?? "empty";
    weaponArt.innerHTML = r.weaponItem ? itemIcon(r.weaponItem, 140) : "";
  }
  const ammoId = r.activeWeapon === "melee" ? "" : `m${r.ammoTier}`;
  if (ammoArt && ammoArt.dataset.artId !== ammoId) {
    ammoArt.dataset.artId = ammoId;
    ammoArt.innerHTML = ammoId
      ? itemIcon({ id: ammoId, uid: ammoId, qty: 1 }, 48)
      : "";
    ammoArt.classList.toggle("hidden", !ammoId);
  }
  const gun = r.weaponItem;
  set(
    "weapon-condition",
    gun && db[gun.id].kind === "weapon"
      ? `耐久 ${Math.ceil(gun.durability ?? 0)}/${Math.ceil(gun.maxDurability ?? 0)} · 威力 ${Math.round(weaponDamageScale(gun.durability ?? 0) * 100)}%`
      : "",
  );
  if (r.activeWeapon === "melee") {
    set("mag-count", "近战");
    set("reserve-count", "");
    set("ammo-name", "不消耗弹药");
  }
  set(
    "armor-readout",
    `护甲 ${Math.ceil(s.equipment.armor?.durability ?? 0)}　头盔 ${Math.ceil(s.equipment.helmet?.durability ?? 0)}`,
  );
  set(
    "regen-readout",
    r.regeneration.remaining > 0
      ? `持续回血 · 剩余 ${Math.ceil(r.regeneration.remaining)} 秒`
      : "",
  );
  const hp = document.getElementById("hp-fill"),
    st = document.getElementById("st-fill");
  if (hp) hp.style.width = `${Math.max(0, p.hp)}%`;
  if (st) st.style.width = `${(p.stamina / MOVEMENT.maxStamina) * 100}%`;
  document
    .querySelector(".raid-timer")
    ?.classList.toggle("warning", r.time < 300);
  const action = document.getElementById("action-progress");
  if (action) {
    const show = r.extract > 0 || r.heal > 0 || r.reload > 0;
    action.classList.toggle("hidden", !show);
    if (show) {
      const progress = r.extract
        ? r.extract / EXTRACT_SECONDS
        : r.heal
          ? 1 - r.heal / r.healDuration
          : 1 - r.reload / (r.weapon?.reload || 2);
      action.innerHTML = `<strong>${r.extract ? `撤离 ${(EXTRACT_SECONDS - r.extract).toFixed(1)} 秒` : r.heal ? "进食中" : "换弹中"}</strong><div class="meter"><i style="width:${progress * 100}%"></i></div>`;
    }
  }
  const boss = r.enemies.find(
      (e) =>
        e.boss &&
        e.state === "combat" &&
        Math.hypot(e.x - p.x, e.y - p.y) < 850,
    ),
    bossHUD = document.getElementById("boss-hud");
  if (bossHUD)
    bossHUD.innerHTML = boss
      ? `<strong>${boss.boss!.name}</strong><div class="meter"><i style="width:${(boss.hp / boss.maxHp) * 100}%"></i></div>`
      : "";
  const mm = document.querySelector<HTMLCanvasElement>("#minimap");
  if (mm) miniMap(mm, r);
  const full = document.querySelector<HTMLCanvasElement>("#full-map");
  if (full) miniMap(full, r, true);
  if (r.search && r.search.revealed < r.search.items.length) {
    const el = document.querySelector<HTMLElement>(
      `[data-search-index="${r.search.revealed}"] .search-ring`,
    );
    if (el)
      el.style.setProperty(
        "--progress",
        `${(r.searchProgress / searchTime(r.search.items[r.search.revealed])) * 360}deg`,
      );
  }
}
function deploy() {
  clearDiscoveries();
  if (!s.equipment.primary && !s.equipment.melee) {
    page = "loadout";
    render();
    toast("请先装备武器");
    return;
  }
  if (mapIndex > unlocked(s)) {
    toast("该地图尚未解锁");
    return;
  }
  if (mapIndex === 0 && !scene3d) {
    try {
      scene3d = new ThreeRenderer();
    } catch {
      toast("当前浏览器未能创建立体场景，请开启硬件加速后重试");
      return;
    }
  }
  modal = "";
  selected = undefined;
  keys.clear();
  mouse.down = false;
  pausePage = "menu";
  raid = new Raid(
    s,
    mapIndex,
    sound,
    overlay,
    (r) => {
      clearDiscoveries();
      raid = undefined;
      selected = undefined;
      keys.clear();
      mouse.down = false;
      syncGameMenu();
      result = r;
      if (!s.temporary) slots[s.slot] = structuredClone(s);
      page = "base";
      render();
    },
    toast,
  );
  raid.onDiscover = showDiscovery;
  renderRaid();
}
async function enterSlot(slot: number, create = false) {
  s = create ? newSave(slot) : (await load(slot))!;
  if (!s) return;
  if (create) {
    s.mode = newMode;
    s.easyUsed = newMode === "easy";
    s.name = (
      document.querySelector<HTMLInputElement>("#new-name")?.value.trim() ||
      "三花七号"
    ).slice(0, 24);
    s.settings = { ...sound.settings };
  } else recoverInterrupted(s);
  remember();
  title = false;
  page = "base";
  raid = undefined;
  result = s.result;
  selected = undefined;
  modal = "";
  sound.settings = s.settings;
  sound.apply();
  localStorage.setItem("tricat.activeSlot", String(slot));
  await refreshSlots();
  render();
}
function selectedMove(to: "stash" | "pack" | "secure") {
  if (!selected) return;
  if (selected.from === "loot") {
    const n =
      raid?.search?.items.findIndex((i) => i.uid === selected!.uid) ?? -1;
    if (n >= 0) raid?.take(n, to === "secure");
    closeItemMenu();
    return;
  }
  if (selected.from === "equipment" || selected.from === "shop") return;
  if (selected.from === to) return;
  if (!move(s, selected.from, to, selected.uid)) toast("空间不足");
  selected = undefined;
  if (raid) overlay();
  else render();
}
async function action(el: HTMLElement) {
  const a = el.dataset.action,
    id = el.dataset.id;
  try {
    sound.start();
    sound.play("click");
  } catch {
    /* Audio availability must never block navigation. */
  }
  if (a === "test-entry") {
    clearDiscoveries();
    s = newTestingSave();
    s.settings = { ...sound.settings };
    title = false;
    page = "base";
    modal = "";
    result = undefined;
    raid = undefined;
    selected = undefined;
    sound.settings = s.settings;
    sound.apply();
    render();
  } else if (a === "title-new") {
    newMode = "standard";
    newSlot = Math.max(
      0,
      slots.findIndex((v) => !v),
    );
    replaceSave = false;
    titlePage = "new";
    render();
  } else if (a === "title-load") {
    await refreshSlots();
    titlePage = "load";
    render();
  } else if (a === "title-settings") {
    titlePage = "settings";
    render();
  } else if (a === "title-main") {
    titlePage = "main";
    render();
  } else if (a === "new-mode") {
    newName =
      document.querySelector<HTMLInputElement>("#new-name")?.value || newName;
    newMode = id as "standard";
    render();
  } else if (a === "new-slot") {
    newName =
      document.querySelector<HTMLInputElement>("#new-name")?.value || newName;
    newSlot = Number(id);
    replaceSave = false;
    render();
  } else if (a === "create") {
    newName =
      document.querySelector<HTMLInputElement>("#new-name")?.value || newName;
    if (slots[newSlot] && !replaceSave) {
      replaceSave = true;
      render();
      return;
    }
    await enterSlot(newSlot, true);
  } else if (a === "load-slot") await enterSlot(Number(id));
  else if (a === "to-title") {
    if (raid && !raid.done) return;
    clearDiscoveries();
    modal = "";
    title = true;
    titlePage = "main";
    selected = undefined;
    result = undefined;
    await refreshSlots();
    render();
  } else if (a === "nav") {
    page = id!;
    if (page === "loadout") sort = "type";
    selected = undefined;
    modal = "";
    render();
  } else if (a === "collection-detail") {
    if (!id || db[id]?.kind !== "collectible" || !s.collection.includes(id))
      return;
    modal = `collection:${id}`;
    render();
  } else if (a === "settings") {
    modal = "base-menu";
    render();
  } else if (a === "base-settings" || a === "base-help") {
    modal = a;
    render();
  } else if (a === "close-modal") {
    modal = "";
    render();
  } else if (a === "select" || a === "loot-select" || a === "buy")
    openItemMenu(el);
  else if (a === "take-selected") {
    const n =
      raid?.search?.items.findIndex((i) => i.uid === selected?.uid) ?? -1;
    if (n >= 0) raid?.take(n);
    closeItemMenu();
  } else if (a === "move") selectedMove(el.dataset.to as "pack");
  else if (a === "equip" || a === "equip-secondary")
    equipSelected(a === "equip-secondary" ? "secondary" : undefined);
  else if (a === "unequip") {
    const slot = id as keyof Equipment,
      i = s.equipment[slot];
    if (i) {
      if (slot === "bag" && s.pack.length > BASE_PACK)
        return toast("请先整理背包");
      if (!canPut(s.stash, i, capacities[s.warehouse]))
        return toast("仓库已满");
      put(s.stash, i, capacities[s.warehouse]);
      s.equipment[slot] = null;
      remember();
      render();
    }
  } else if (a === "stash-all") {
    const r = stashAll(s);
    closeItemMenu();
    render();
    toast(
      r.left
        ? `已放回 ${r.moved} 件，剩余 ${r.left} 件请整理仓库空间`
        : "背包物品已全部放回仓库",
    );
  } else if (a === "repair") {
    const item = [...s.stash, ...s.pack, ...Object.values(s.equipment)].find(
      (i) => i?.uid === id,
    );
    toast(item && repair(s, item) ? "修复完成" : "无需修复或金币不足");
    render();
  } else if (a === "warehouse") {
    toast(upgradeWarehouse(s) ? "仓库扩容完成" : "金币不足");
    render();
  } else if (a === "safe-menu") {
    modal = "safe";
    render();
  } else if (a === "safe") {
    toast(upgradeSafe(s, Number(id)) ? "安全箱升级完成" : "金币不足或尚未解锁");
    modal = "";
    render();
  } else if (a === "sell") {
    if (
      selected &&
      (selected.from === "stash" ||
        selected.from === "overflow" ||
        selected.from === "pack")
    ) {
      toast(`出售获得 ${money(sell(s, selected.from, selected.uid))} 金币`);
      selected = undefined;
      render();
    }
  } else if (a === "sell-all") {
    let value = 0;
    for (const i of [...s.stash])
      if (db[i.id].kind === "collectible") value += sell(s, "stash", i.uid);
    toast(`出售获得 ${money(value)} 金币`);
    render();
  } else if (a === "category") {
    category = id!;
    render();
  } else if (a === "purchase-selected") {
    toast(
      buy(s, selected!.uid)
        ? "已购买，物品放入仓库"
        : "无法购买，请检查金币、空间与解锁条件",
    );
    render();
  } else if (a === "buyback") {
    toast(buyBack(s, id!) ? "已购入仓库" : "无法回购，请检查解锁与金币");
    render();
  } else if (a === "rescue") {
    toast(rescue(s) ? "救济装备已发放" : "金币少于一千且没有武器时可领取");
    render();
  } else if (a === "map-select") {
    mapIndex = Number(id);
    render();
  } else if (a === "quick-deploy") {
    mapIndex = 0;
    page = "maps";
    render();
  } else if (a === "deploy") deploy();
  else if (a === "close-result") {
    result = undefined;
    raid = undefined;
    s.result = undefined;
    remember();
    page = "base";
    render();
  } else if (a === "pause") {
    if (raid) {
      raid.paused = !raid.paused;
      pausePage = "menu";
      mouse.down = false;
      keys.clear();
      overlay();
    }
  } else if (a === "pause-menu") {
    pausePage = "menu";
    overlay();
  } else if (a === "pause-settings") {
    pausePage = "settings";
    overlay();
  } else if (a === "pause-help") {
    pausePage = "help";
    overlay();
  } else if (a === "abort") {
    if (raid?.abort()) {
      clearDiscoveries();
      raid = undefined;
      result = undefined;
      selected = undefined;
      page = "base";
      if (!s.temporary) slots[s.slot] = structuredClone(s);
      render();
      toast("已恢复出击前状态");
    } else toast("未能恢复出击前存档，已保持暂停");
  } else if (a === "toggle-map") {
    if (raid) {
      raid.mapOpen = !raid.mapOpen;
      raid.interrupt();
      overlay();
    }
  } else if (a === "close-search") {
    if (raid) {
      raid.interrupt();
      overlay();
    }
  } else if (a === "answer") raid?.answer(Number(id));
  else if (a === "take-safe") raid?.take(Number(id), true);
  else if (a === "take-all") {
    if (raid?.search) {
      for (let n = raid.search.revealed - 1; n >= 0; n--) raid.take(n);
    }
  } else if (a === "drop") {
    if (raid?.dropItem(id!)) {
      selected = undefined;
      overlay();
    }
  } else if (a === "eat") {
    raid?.useFood(id, selected?.from === "loot" ? "loot" : "pack");
  } else if (a === "ammo") {
    raid?.switchAmmo(Number(id));
    overlay();
  } else if (a === "next-cycle" && !raid && s.completed) {
    s.ng++;
    s.completed = false;
    s.defeated = [];
    s.coins += 15000;
    remember();
    modal = "";
    render();
    toast("已开启新周目");
  } else if (a === "export" && !s.temporary) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `三角猫行动-存档${s.slot + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (el && !el.hasAttribute("disabled")) {
    e.preventDefault();
    const wasMenu = !!el.closest("#item-menu");
    void action(el).then(() => {
      if (wasMenu) closeItemMenu();
    });
  }
});
root.addEventListener("dblclick", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>(".item-slot");
  if (!el || el.dataset.from === "shop") return;
  const from = el.dataset.from as Source,
    uid = el.dataset.id!;
  if (el.dataset.from === "loot") {
    const n = raid?.search?.items.findIndex((i) => i.uid === uid) ?? -1;
    if (n >= 0) raid?.take(n, false, true);
    closeItemMenu();
    return;
  }
  selected = { from, uid };
  if (from === "stash" || from === "overflow") {
    const i = s[from].find((i) => i.uid === uid),
      kind = i ? db[i.id].kind : undefined;
    const empty =
      kind === "weapon"
        ? !s.equipment.primary
        : kind && ["armor", "helmet", "bag", "ammo", "melee"].includes(kind)
          ? !s.equipment[kind as keyof Equipment]
          : false;
    if (empty) equipSelected();
    else selectedMove("pack");
  } else if (from === "secure") selectedMove("pack");
  else if (from === "pack" && !raid) selectedMove("stash");
});
document.addEventListener("input", (e) => {
  const input = e.target as HTMLInputElement,
    key = input.dataset.setting as keyof Save["settings"];
  if (!key) return;
  if (key === "aim") s.settings.aim = input.value;
  else s.settings[key] = Number(input.value);
  sound.apply();
  const out = input.parentElement?.querySelector("output");
  if (out) out.textContent = `${Math.round(Number(input.value) * 100)}%`;
  if (!title || slots[s.slot]) remember();
});
document.addEventListener("change", async (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === "weapon-filter") {
    weaponFilter = input.value;
    render();
  } else if (input.id === "filter") {
    filter = input.value;
    render();
  } else if (input.id === "sort") {
    sort = input.value;
    render();
  } else if (input.id === "import-save" && input.files?.[0]) {
    try {
      if (input.files[0].size > 2e6) throw Error();
      const data = validateSave(JSON.parse(await input.files[0].text()));
      data.slot = s.slot;
      s = data;
      recoverInterrupted(s);
      remember();
      sound.settings = s.settings;
      sound.apply();
      await refreshSlots();
      render();
      toast("存档已导入");
    } catch {
      toast("存档格式无效");
    }
  }
});

root.addEventListener("pointerover", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-item]");
  if (
    !el ||
    el.contains((e as PointerEvent).relatedTarget as Node) ||
    document.querySelector("#item-menu")
  )
    return;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    const d = db[el.dataset.item!];
    if (!d || !el.isConnected) return;
    document.querySelector("#item-tooltip")?.remove();
    const tip = document.createElement("div");
    tip.id = "item-tooltip";
    tip.className = "panel item-tooltip";
    tip.innerHTML = `<strong style="color:${itemNameColor(d.id) || "inherit"}">${esc(name(d.id))}</strong><p>${esc(d.desc)}</p>${d.kind === "food" ? `<p>${foodEffect(d)}</p>` : ""}`;
    root.append(tip);
    const r = el.getBoundingClientRect(),
      b = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(12, Math.min(r.right + 8, innerWidth - b.width - 12))}px`;
    tip.style.top = `${Math.max(12, Math.min(r.top, innerHeight - b.height - 12))}px`;
  }, 280);
});
root.addEventListener("pointerout", (e) => {
  const el = (e.target as HTMLElement).closest("[data-item]");
  if (el && !el.contains((e as PointerEvent).relatedTarget as Node)) {
    clearTimeout(hoverTimer);
    document.querySelector("#item-tooltip")?.remove();
  }
});
document.addEventListener("pointerdown", (e) => {
  if (!(e.target as HTMLElement).closest("#item-menu,[data-item]"))
    closeItemMenu();
});
root.addEventListener(
  "scroll",
  (e) => {
    if (!(e.target as HTMLElement).closest?.("#item-menu")) closeItemMenu();
  },
  true,
);

let draggedItem: { from: string; uid: string } | undefined;
root.addEventListener("dragstart", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[draggable]");
  closeItemMenu();
  if (el) {
    draggedItem = { from: el.dataset.from!, uid: el.dataset.id! };
    (e as DragEvent).dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ from: el.dataset.from, uid: el.dataset.id }),
    );
    (e as DragEvent).dataTransfer!.effectAllowed = "move";
  }
});
let dragScroll: HTMLElement | undefined,
  dragVelocity = 0,
  dragFrame = 0;
function stopDragScroll() {
  cancelAnimationFrame(dragFrame);
  dragFrame = 0;
  dragScroll = undefined;
}
function scrollDragging() {
  if (!draggedItem || !dragScroll || !dragVelocity) {
    stopDragScroll();
    return;
  }
  dragScroll.scrollTop += dragVelocity;
  dragFrame = requestAnimationFrame(scrollDragging);
}
root.addEventListener("dragover", (e) => {
  const target = e.target as HTMLElement;
  if (target.closest("[data-drop]")) e.preventDefault();
  const area = target.closest<HTMLElement>(
    ".inventory-scroll,.warehouse-scroll",
  );
  if (!area || !draggedItem) {
    stopDragScroll();
    return;
  }
  const rect = area.getBoundingClientRect(),
    y = (e as DragEvent).clientY;
  dragScroll = area;
  dragVelocity = y < rect.top + 45 ? -12 : y > rect.bottom - 45 ? 12 : 0;
  if (!dragFrame) dragFrame = requestAnimationFrame(scrollDragging);
});
document.addEventListener("drop", stopDragScroll, true);
root.addEventListener("drop", (e) => {
  const target = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]");
  if (!target) return;
  e.preventDefault();
  try {
    const data = JSON.parse(
      (e as DragEvent).dataTransfer!.getData("text/plain"),
    );
    if (
      !["stash", "pack", "secure", "overflow", "loot", "equipment"].includes(
        data.from,
      )
    )
      return;
    selected = data;
    if (target.dataset.drop === "equipment") {
      equipSelected(target.dataset.slot as keyof Equipment);
      return;
    }
    if (data.from === "equipment") {
      const slot = Object.entries(s.equipment).find(
        ([, i]) => i?.uid === data.uid,
      )?.[0] as keyof Equipment;
      const to = target.dataset.drop as "pack" | "stash" | "secure";
      if (!slot || !["pack", "stash", "secure"].includes(to)) return;
      if (raid) {
        if (to !== "pack") {
          toast("请先将装备卸下至背包");
          closeItemMenu();
          return;
        }
        if (!raid.unequipToPack(slot)) toast("背包空间不足");
        overlay();
      } else {
        const i = s.equipment[slot]!;
        const cap =
          to === "pack"
            ? slot === "bag"
              ? BASE_PACK
              : packCapacity(s)
            : to === "stash"
              ? capacities[s.warehouse]
              : safeCap[s.safe];
        if (
          (slot === "bag" && s.pack.length > BASE_PACK) ||
          !canPut(s[to], i, cap)
        )
          toast("空间不足");
        else {
          put(s[to], i, cap);
          s.equipment[slot] = null;
          remember();
          render();
        }
      }
      closeItemMenu();
      return;
    }
    selectedMove(target.dataset.drop as "pack");
  } catch {}
});
document.addEventListener("dragover", (e) => {
  if (raid && !raid.done && draggedItem?.from === "pack") e.preventDefault();
});
document.addEventListener("drop", (e) => {
  if (!raid || raid.done || draggedItem?.from !== "pack") return;
  const target = e.target as HTMLElement;
  if (
    target.closest(
      ".inventory-panel,.loot-panel,.puzzle-panel,.modal-backdrop,#item-menu,[data-drop]",
    )
  )
    return;
  e.preventDefault();
  raid.dropItem(draggedItem.uid);
  draggedItem = undefined;
  closeItemMenu();
  overlay();
});
document.addEventListener("dragend", () => {
  stopDragScroll();
  draggedItem = undefined;
});
window.addEventListener(
  "keydown",
  (e) => {
    if (
      (e.target as HTMLElement).matches("input,select,textarea") &&
      e.code !== "Escape"
    )
      return;
    if (["Tab", "Space"].includes(e.code)) e.preventDefault();
    if (!raid || raid.done) {
      if (e.code === "Escape" && !title) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeItemMenu();
        // Close a detail/menu first; otherwise leave the base subpage.
        if (!modal && !result) {
          page = "base";
          selected = undefined;
        }
        modal = "";
        render();
      }
      return;
    }
    const r = raid;
    if (e.repeat) return;
    if (e.code === "Escape" || e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeItemMenu();
      if (!r.paused && (r.inventory || r.search || r.puzzle || r.mapOpen)) {
        r.inventory = false;
        r.mapOpen = false;
        r.interrupt();
        keys.clear();
        mouse.down = false;
        overlay();
        return;
      }
      r.paused = !r.paused;
      pausePage = "menu";
      keys.clear();
      mouse.down = false;
      overlay();
      return;
    }
    if (r.paused) return;
    keys.add(e.code);
    if (r.puzzle && /^Digit[1-4]$/.test(e.code)) {
      r.answer(r.puzzle.choices[Number(e.code.at(-1)) - 1]);
      return;
    }
    if (e.code === "Space")
      r.roll(
        (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
        (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0),
      );
    if (e.code === "Digit3") {
      r.selectWeapon("melee");
      r.interrupt();
      overlay();
    }
    if (e.code === "KeyE") {
      closeItemMenu();
      r.interact();
      if (r.search || r.puzzle) {
        r.inventory = true;
        r.mapOpen = false;
        // Do not let the approach movement cancel a search on the next frame.
        keys.clear();
        mouse.down = false;
      }
      overlay();
    }
    if (e.code === "KeyR") r.loadMagazine();
    if (e.code === "KeyF") r.useFood();
    if (e.code === "Tab") {
      r.inventory = !r.inventory;
      if (!r.inventory) r.interrupt();
      r.mapOpen = false;
      selected = undefined;
      overlay();
    }
    if (e.code === "KeyM") {
      r.mapOpen = !r.mapOpen;
      r.interrupt();
      overlay();
    }
    if (
      (e.code === "Digit1" && r.activeWeapon !== "primary") ||
      (e.code === "Digit2" && r.activeWeapon !== "secondary")
    ) {
      r.selectWeapon(e.code === "Digit1" ? "primary" : "secondary");
      overlay();
    }
  },
  true,
);
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  const c = document.querySelector<HTMLElement>("#crosshair");
  if (c) {
    c.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    c.style.borderColor = s.settings.aim;
  }
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 0) {
    mouse.down = true;
    sound.start();
  }
});
window.addEventListener("pointerup", () => (mouse.down = false));
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
canvas.addEventListener(
  "wheel",
  (e) => {
    if (
      !raid ||
      raid.done ||
      raid.paused ||
      raid.inventory ||
      raid.search ||
      raid.puzzle ||
      raid.mapOpen
    )
      return;
    e.preventDefault();
    if (e.deltaY) raid.switchWeapon(e.deltaY);
  },
  { passive: false },
);
function autoPause() {
  keys.clear();
  mouse.down = false;
  if (raid && !raid.done) {
    raid.paused = true;
    pausePage = "menu";
    overlay();
  }
}
window.addEventListener("blur", autoPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) autoPause();
  else if (raid?.paused) overlay();
});
window.addEventListener("pagehide", () => {
  if (s && !title) persist(s);
});
async function boot() {
  if (import.meta.env.PROD && "serviceWorker" in navigator)
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: "none" })
      .catch(() => {});
  await initDB();
  await refreshSlots();
  const last = Number(localStorage.getItem("tricat.activeSlot") || 0);
  s = slots[last] || slots.find(Boolean) || newSave(0);
  sound = new Sound(s.settings);
  flat = new Renderer(canvas);
  class Loop extends Phaser.Scene {
    lastFrame = performance.now();
    constructor() {
      super("平面模拟");
    }
    update(_time: number, delta: number) {
      const now = performance.now();
      const elapsed = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      if (raid && !raid.done) {
        const p =
          raid.map === 0 && scene3d
            ? scene3d.screenToWorld(pointer.x, pointer.y)
            : flat.screenToWorld(pointer.x, pointer.y);
        mouse.x = p.x;
        mouse.y = p.y;
        // Consume real elapsed time in bounded physics steps, including on slower GPUs.
        let remaining = Math.min(elapsed, 0.5);
        while (remaining > 0.00001 && raid && !raid.done) {
          const step = Math.min(remaining, 1 / 60);
          raid.update(step, keys, mouse);
          remaining -= step;
        }
        if (performance.now() - volumeFrame > 80) {
          updateHUD();
          volumeFrame = performance.now();
        }
      }
    }
  }
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    canvas,
    width: innerWidth,
    height: innerHeight,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    scene: [Loop],
    scale: { mode: Phaser.Scale.RESIZE },
    fps: { target: 60, smoothStep: true },
  });
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    if (raid && !raid.done) {
      if (raid.map === 0 && scene3d) scene3d.render(raid, flat);
      else flat.raid(raid);
    }
  });
  window.addEventListener("resize", () =>
    game.scale.resize(innerWidth, innerHeight),
  );
  render();
  if (saveIssue) toast(saveIssue);
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("test"))
    Object.assign(window, {
      __game: {
        get save() {
          return s;
        },
        get raid() {
          return raid;
        },
        get renderer() {
          return flat;
        },
        get renderer3d() {
          return scene3d;
        },
        get sound() {
          return sound;
        },
        deploy,
        render,
        selectMap: (n: number) => (mapIndex = n),
        setSave: (v: Save) => {
          s = v;
          title = false;
          page = "base";
          sound.settings = s.settings;
          render();
        },
      },
    });
}
void boot();
