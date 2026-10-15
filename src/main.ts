import Phaser from "phaser";
import "./style.css";
import {
  items,
  db,
  weapons,
  foods,
  ammo,
  bags,
  maps,
  bosses,
  rarity,
  colors,
  capacities,
  safeCap,
  safeNames,
  safePrice,
  warehouseCosts,
  makeItem,
  sale,
  kindNames,
  type Item,
  type Kind,
} from "./data";
import {
  initDB,
  load,
  newSave,
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
  rescue,
  recoverInterrupted,
  validateSave,
  type Save,
  type Result,
  type Equipment,
} from "./store";
import { icon, itemIcon } from "./art";
import { Sound } from "./audio";
import { Raid } from "./raid";
import { Renderer, drawBase, miniMap } from "./render";

const root = document.querySelector<HTMLDivElement>("#ui")!;
const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
let s: Save, sound: Sound, raid: Raid | undefined, renderer: Renderer;
let page = "home",
  category = "weapon",
  mapIndex = 0,
  selected:
    { from: "stash" | "pack" | "secure" | "overflow"; uid: string } | undefined,
  sort = "tier",
  filter = "all",
  modal = "",
  result: Result | undefined;
let slots: (Save | null)[] = [null, null, null],
  lastHUD = 0,
  baseTick = 0,
  keys = new Set<string>(),
  mouse = { x: 0, y: 0, down: false },
  pointer = { x: 0, y: 0 };
const money = (n: number) => Math.floor(n).toLocaleString("zh-CN");
const esc = (x: unknown) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (label: string, action: string, extra = "", cls = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function toast(message: string) {
  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;
  document.querySelector("#toasts")!.append(box);
  const notices = document.querySelectorAll("#toasts .toast");
  if (notices.length > 3) notices[0].remove();
  setTimeout(() => box.remove(), 4200);
}
function logo() {
  return `<span class="brand-mark">${icon("paw", "#e6cc94", 31)}</span><span><strong>三角猫行动</strong><small>OPERATION TRI-CAT</small></span>`;
}
function itemCard(i: Item, from: string, shop = false) {
  const d = db[i.id],
    locked = shop && unlocked(s) < (d.unlock ?? 0),
    active = selected?.uid === i.uid;
  return `<button class="item-card ${active ? "selected" : ""} ${locked ? "locked" : ""}" style="--rarity:${colors[d.tier]}" data-action="${shop ? "buy" : "select"}" data-id="${esc(shop ? i.id : i.uid)}" data-from="${from}" ${!shop ? 'draggable="true"' : ""} title="${esc(d.name + " · " + d.desc)}"><span class="item-tier">${d.tier} · ${rarity[d.tier]}</span><span class="item-art">${itemIcon(i, 58)}</span><strong>${d.name}</strong><small>${shop ? (locked ? `通关第 ${d.unlock} 关解锁` : `◈ ${money(d.price)}${d.kind === "ammo" ? " / 30发" : ""}`) : d.kind === "ammo" ? `${i.qty} 发` : i.durability !== undefined ? `耐久 ${Math.ceil(i.durability)} / ${Math.ceil(i.maxDurability!)}` : d.kind === "collectible" ? `◈ ${money(sale(i))}` : kindNames[d.kind]}</small></button>`;
}
function panelTitle(title: string, meta: string) {
  return `<div class="panel-title"><h2>${title}</h2><span>${meta}</span></div>`;
}
function header() {
  return `<header class="topbar"><a class="brand" href="#" data-action="nav" data-id="home">${logo()}</a><div class="call-sign"><span class="online-dot"></span> CTI 干员 · ${esc(s.name)}</div><div class="top-right"><span class="coin">◈ ${money(s.coins)}</span>${button(icon("settings", "#c9d0ba", 23), "nav", 'data-id="settings" aria-label="设置"', "icon-button")}</div></header><nav class="navigation" aria-label="基地导航">${[
    ["home", "暖窝基地", "paw"],
    ["loadout", "仓库与整备", "bag"],
    ["shop", "补给商店", "box"],
    ["maps", "战区地图", "map"],
    ["collection", "收藏图鉴", "gem"],
  ]
    .map(([id, label, i]) =>
      button(
        `${icon(i, page === id ? "#e2c38a" : "#8a9d8a", 21)}${label}`,
        "nav",
        `data-id="${id}" aria-current="${page === id ? "page" : "false"}"`,
        page === id ? "active" : "",
      ),
    )
    .join(
      "",
    )}<span class="nav-end">${s.mode === "easy" ? "九命归巢 · 轻松模式" : "一命一包 · 标准模式"}</span></nav>`;
}
function render() {
  if (!s) return;
  if (raid && !raid.done) {
    renderRaid();
    return;
  }
  canvas.classList.add("hidden");
  document.body.classList.remove("in-raid");
  root.innerHTML =
    header() +
    `<main class="base-main ${page === "loadout" ? "wide" : ""}">${page === "home" ? home() : page === "loadout" ? loadout() : page === "shop" ? shop() : page === "maps" ? mapPage() : page === "collection" ? collection() : settings()}</main><footer class="base-footer"><span>CTI / 暖窝基地 · 第 ${s.ng + 1} 周目</span><span>自动存档已启用 · 离线单人</span><span>每一条命，都值得带回家。</span></footer>` +
    renderModal();
  if (page === "home") drawHome();
  if (result?.success && result.bosses.includes("doctor") && s.completed)
    document
      .querySelector(".result-modal .primary")
      ?.insertAdjacentHTML(
        "beforebegin",
        '<div class="hint-box">猫晶核心归位，爪洲的灯又亮了起来。无线电里传来灰耳久违的声音：“七号，回家吃饭。”老爪已经开好了最后一罐金枪鱼。<br><strong>三角猫行动 · 全篇完</strong></div>',
      );
  if (page === "shop") {
    document
      .querySelector(".base-main")!
      .insertAdjacentHTML("beforeend", buybackPanel());
    document
      .querySelectorAll<HTMLElement>(".shop-grid .item-card")
      .forEach((card) => {
        const d = db[card.dataset.id!];
        const spec = document.createElement("span");
        spec.className = "item-spec";
        spec.textContent =
          d.kind === "weapon"
            ? `伤害 ${d.damage} · ${d.rpm} 发/分`
            : d.kind === "bag"
              ? `${d.capacity} 格`
              : d.kind === "food"
                ? `恢复 ${d.heal} 生命`
                : d.kind === "ammo"
                  ? d.desc
                  : `${d.tier} 级 · ${d.durability} 耐久`;
        card.append(spec);
        if (d.tier >= 4) {
          const left = Math.max(
              0,
              (d.tier === 5 ? 1 : 2) - (s.stock?.[d.id] ?? 0),
            ),
            stock = document.createElement("small");
          stock.textContent = `本轮剩余 ${left} · 出击后补货`;
          card.append(stock);
          if (!left) card.setAttribute("disabled", "");
        }
      });
  }
}
function home() {
  const next = unlocked(s),
    progress = s.defeated.length;
  return `<div class="page-heading"><div><span class="eyebrow">WELCOME HOME, OPERATOR</span><h1>欢迎回到暖窝。</h1><p>整备一下。下一趟，把好运也带回来。</p></div>${button("操作指南 ↗", "modal", 'data-id="help"', "text-button")}</div><div class="home-grid"><section class="hero-panel"><div class="hero-overlay"><span class="tag">安全区域 · 物资充足</span><h2>小小的猫，<br>大大的行动。</h2><p>搜寻珍宝，迎战敌猫，平安归巢。</p></div><canvas id="base-art" width="1050" height="660" aria-label="猫咪干员与暖窝基地"></canvas><div class="hero-bottom"><div class="chief-quote"><strong>老爪的提醒</strong><span>${s.completed ? "干得漂亮，干员。想再挑战一次吗？" : "别把九条命，都花在同一罐鱼上。"}</span></div>${button("整理装备 →", "nav", 'data-id="loadout"', "light-button")}</div></section><aside class="home-side"><section class="dispatch-panel">${panelTitle("下一次行动", `0${next + 1} / 04`)}<div class="dispatch-art map-art map-${next}"><span class="map-number">0${next + 1}</span><div class="map-buildings"></div><span class="tag">${next === 0 ? "低危 · 适合新手" : next === 3 ? "极危 · 三名首领" : "中高危 · 提升装备"}</span></div><h3>${maps[next].name}</h3><p>${maps[next].sub}</p><div class="dispatch-info"><span>限时 <b>15 分钟</b></span><span>撤离 <b>停留 5 秒</b></span></div>${button("选择战区  →", "nav", 'data-id="maps"', "primary full")}</section><section class="progress-panel">${panelTitle("行动档案", `${Math.min(progress, 6)} / 6`)}<div class="progress-track"><i style="width:${(progress / 6) * 100}%"></i></div><p>${s.completed ? "主线已通关 · 猫晶核心已安全收容" : `主线目标：${bosses.find((b) => !s.defeated.includes(b.id))?.name || "完成最终撤离"}`}</p><div class="home-stats"><div><strong>${s.stats.extracts}</strong><span>成功撤离</span></div><div><strong>${s.collection.length}</strong><span>珍宝发现</span></div><div><strong>${s.stats.kills}</strong><span>敌猫击败</span></div></div></section></aside></div><div class="quick-grid">${[
    [
      "bag",
      "仓库与整备",
      `${s.stash.length} / ${capacities[s.warehouse]} 格 · 出发前检查装备`,
      "loadout",
    ],
    ["box", "补给商店", "枪械、护具与一罐安心的晚餐", "shop"],
    [
      "gem",
      "收藏图鉴",
      `${s.collection.length} / 60 件 · 每件都有猫腻`,
      "collection",
    ],
  ]
    .map(([i, title, desc, id]) =>
      button(
        `${icon(i, "#b7ba8b", 36)}<span><strong>${title}</strong><small>${desc}</small></span><b>↗</b>`,
        "nav",
        `data-id="${id}"`,
        "quick-card",
      ),
    )
    .join("")}</div>`;
}
function equipment() {
  return `<div class="equipment-slots">${(
    [
      ["primary", "主武器", "rifle"],
      ["secondary", "副武器", "smg"],
      ["armor", "护甲", "armor"],
      ["helmet", "头盔", "helmet"],
      ["bag", "背包", "bag"],
    ] as const
  )
    .map(([slot, label, i]) => {
      const item = s.equipment[slot];
      return `<div class="equipment-slot"><div class="slot-label">${label}${item?.durability !== undefined ? button(`修复 ◈${repairCost(item)}`, "repair", `data-id="${slot}" ${repairCost(item) === 0 ? "disabled" : ""}`, "tiny") : ""}</div>${item ? `<div class="equipped-art">${itemIcon(item, 44)}<span><strong>${db[item.id].name}</strong><small>${item.durability !== undefined ? `耐久 ${Math.ceil(item.durability)} / ${Math.ceil(item.maxDurability!)}` : db[item.id].desc}</small></span>${button("卸下", "unequip", `data-id="${slot}"`, "tiny")}</div>` : `<div class="empty-equipment">${icon(i, "#728776", 37)}<span>未装备</span></div>`}</div>`;
    })
    .join("")}</div>`;
}
function loadout() {
  let stash = [...s.stash];
  if (filter !== "all") stash = stash.filter((i) => db[i.id].kind === filter);
  stash.sort((a, b) =>
    sort === "value"
      ? sale(b) - sale(a)
      : sort === "name"
        ? db[a.id].name.localeCompare(db[b.id].name, "zh-CN")
        : db[b.id].tier - db[a.id].tier,
  );
  return `<div class="page-heading"><div><span class="eyebrow">MAKE EVERY SLOT COUNT</span><h1>仓库与整备</h1><p>点击物品查看操作 · 双击装备 · 拖拽物品转移</p></div>${button(s.warehouse < 4 ? `扩建至 ${capacities[s.warehouse + 1]} 格 · ◈ ${money(warehouseCosts[s.warehouse + 1])}` : "仓库已满级", "warehouse", s.warehouse >= 4 ? "disabled" : "", "secondary")}</div>${s.overflow.length ? `<section class="overflow-panel">${panelTitle("待整理战利品", `${s.overflow.length} 件 · 整理后才能出击`)}<div class="item-grid">${s.overflow.map((i) => itemCard(i, "overflow")).join("")}</div></section>` : ""}<div class="loadout-layout"><section class="panel stash-panel" data-drop="stash">${panelTitle("仓库", `${s.stash.length} / ${capacities[s.warehouse]} 格`)}<div class="toolbar"><select id="filter" aria-label="物品分类"><option value="all">全部物品</option>${Object.entries(
    kindNames,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}" ${filter === k ? "selected" : ""}>${v}</option>`,
    )
    .join(
      "",
    )}</select><select id="sort" aria-label="排序"><option value="tier">按品质</option><option value="value" ${sort === "value" ? "selected" : ""}>按价值</option><option value="name" ${sort === "name" ? "selected" : ""}>按名称</option></select>${button("出售收集品", "sell-all", "", "tiny")}</div><div class="item-grid">${stash.map((i) => itemCard(i, "stash")).join("")}${!stash.length ? '<div class="empty-state">仓库空空的，去战区带点东西回来吧。</div>' : ""}</div></section><section class="panel operator-panel">${panelTitle("出战装备", `背包 ${s.pack.length}/${packCapacity(s)}`)}${equipment()}<div data-drop="pack">${panelTitle("出战背包", "物品随你进入战区")}<div class="item-grid compact">${s.pack.map((i) => itemCard(i, "pack")).join("")}${Array.from({ length: Math.max(0, packCapacity(s) - s.pack.length) }, () => '<div class="empty-cell"></div>').join("")}</div></div><div data-drop="secure">${panelTitle(safeNames[s.safe], `${s.secure.length}/${safeCap[s.safe]} 格 · 死亡不掉落`)}<div class="item-grid compact safe-grid">${s.secure.map((i) => itemCard(i, "secure")).join("")}${Array.from({ length: safeCap[s.safe] - s.secure.length }, () => '<div class="empty-cell">◇</div>').join("")}</div></div>${button("升级安全箱", "modal", 'data-id="safe"', "secondary full")}</section><aside class="panel details-panel">${details()}${button("前往战区 →", "nav", 'data-id="maps"', "primary full")}</aside></div>`;
}
function details() {
  const item = selected
    ? s[selected.from].find((i) => i.uid === selected!.uid)
    : null;
  if (!item)
    return `<div class="detail-placeholder">${icon("bag", "#9eae91", 76)}<h3>出发前，整理一下。</h3><p>把子弹和食物放进背包，贵重物品放进安全箱。</p><p>装备在角色身上不占背包格。子弹每 30 发占一格。</p></div>`;
  const d = db[item.id],
    from = selected!.from;
  return `<div class="detail-art" style="--rarity:${colors[d.tier]}">${itemIcon(item, 110)}</div><span class="rarity-label" style="color:${colors[d.tier]}">${rarity[d.tier]} · ${kindNames[d.kind]}</span><h2>${d.name}</h2><p>${d.desc}</p>${d.damage ? `<div class="detail-stats"><span>伤害 <b>${d.damage}</b></span><span>射速 <b>${d.rpm}</b></span><span>弹匣 <b>${d.mag}</b></span><span>射程 <b>${d.range}</b></span></div>` : ""}<div class="detail-actions">${["weapon", "armor", "helmet", "bag"].includes(d.kind) && from !== "secure" ? button("装备", "equip", "", "primary full") : ""}${d.kind === "weapon" && from !== "secure" ? button("装备为副武器", "equip-secondary", "", "secondary full") : ""}${from !== "pack" ? button("放入出战背包", "move", 'data-to="pack"', "secondary full") : ""}${from !== "stash" ? button("放回仓库", "move", 'data-to="stash"', "secondary full") : ""}${from !== "secure" ? button("放入安全箱", "move", 'data-to="secure"', "secondary full") : ""}${from === "stash" || from === "overflow" ? button(`出售 · ◈ ${money(sale(item))}`, "sell", "", "text-button full") : ""}</div>`;
}
function shop() {
  const products = items.filter((d) =>
    category === "armor"
      ? ["armor", "helmet", "bag"].includes(d.kind)
      : category === "food"
        ? d.kind === "food"
        : d.kind === category,
  );
  return `<div class="page-heading"><div><span class="eyebrow">A LITTLE PREPARATION GOES A LONG WAY</span><h1>补给商店</h1><p>老爪精选。童叟无欺，猫粮管够。</p></div><span class="badge">回收价为基准价的 65%</span></div><div class="shop-layout"><aside class="panel shop-side"><h3>补给分类</h3>${[
    ["weapon", "武器", "rifle"],
    ["armor", "护具与背包", "armor"],
    ["ammo", "子弹", "ammo"],
    ["food", "食物与补给", "can"],
  ]
    .map(([id, t, i]) =>
      button(
        `${icon(i, "#bdc3a1", 26)}${t}`,
        "category",
        `data-id="${id}"`,
        category === id ? "active" : "",
      ),
    )
    .join(
      "",
    )}<div class="shop-tip">${icon("paw", "#c3b27f", 42)}<strong>第一次出发？</strong><p>先备好 90 发子弹和两份食物。贵的装备，也怕忘记装弹。</p></div></aside><section class="panel"><div class="shop-presets"><span>一键配装到背包</span>${button("轻装 · ◈ 2,310", "preset", 'data-id="0"', "tiny")}${button("均衡 · ◈ 7,140", "preset", 'data-id="1"', "tiny")}${button("重装 · ◈ 32,840", "preset", 'data-id="2"', "tiny")}</div><div class="shop-grid">${products.map((d) => itemCard({ uid: d.id, id: d.id, qty: d.kind === "ammo" ? 30 : 1 }, "shop", true)).join("")}</div></section></div>`;
}
function buybackPanel() {
  const lost = s.buyback.filter((i) => db[i.id].kind !== "collectible");
  if (!lost.length) return "";
  return `<section class="panel buyback-panel">${panelTitle("找回同款", "按商店现价重新购买 · 未解锁物品不可购买")}<div class="shop-grid">${lost.map((i) => `<div class="buyback-item">${itemIcon(i, 42)}<strong>${db[i.id].name}${db[i.id].kind === "ammo" ? ` ×${i.qty}` : ""}</strong>${button(`◈ ${money(Math.ceil(db[i.id].price * (db[i.id].kind === "ammo" ? i.qty / 30 : 1)))}`, "buyback", `data-id="${i.uid}" ${unlocked(s) < (db[i.id].unlock ?? 0) ? "disabled" : ""}`, "tiny")}</div>`).join("")}</div></section>`;
}
function mapPage() {
  const m = maps[mapIndex],
    locked = mapIndex > unlocked(s);
  return `<div class="page-heading"><div><span class="eyebrow">PACK LIGHT. COME HOME RICH.</span><h1>选择战区</h1><p>前往更远的地方。也记得回家的路。</p></div><span class="badge">${s.mode === "easy" ? "死亡保留全部物品" : "死亡掉落 · 安全箱保留"}</span></div><div class="map-cards">${maps.map((m, i) => button(`<div class="map-art map-${i}"><div class="map-buildings"></div><span class="map-number">0${i + 1}</span><span class="tag">${i > unlocked(s) ? "尚未解锁" : s.defeated.includes(m.bosses.at(-1)!) ? "首领已击败" : "可进入"}</span></div><div class="map-card-text"><small>${m.en}</small><h2>${m.name}</h2><p>${["低危 · 推荐 1 级护具", "中危 · 推荐 2 级护具", "高危 · 推荐 3 级护具", "极危 · 推荐 4 级护具"][i]}</p></div>`, "map-select", `data-id="${i}"`, `map-card ${i === mapIndex ? "selected" : ""} ${i > unlocked(s) ? "locked" : ""}`)).join("")}</div><section class="mission-brief panel"><div><span class="eyebrow">行动简报 / 0${mapIndex + 1}</span><h2>${m.name}</h2><p>${m.sub}</p><div class="boss-tags">${bosses
    .filter((b) => b.map === mapIndex)
    .map(
      (b) =>
        `<span class="${s.defeated.includes(b.id) ? "done" : ""}">${s.defeated.includes(b.id) ? "✓" : "◇"} ${b.name}</span>`,
    )
    .join(
      "",
    )}</div>${mapIndex === 3 ? '<p class="muted">先击败零号缅因与霜瞳并成功撤离保存密钥，再挑战博士。无需一局打完三个 Boss。</p>' : ""}</div><div class="mission-facts"><div><small>行动限时</small><strong>15 分钟</strong></div><div><small>免费撤离</small><strong>1～2 处</strong></div><div><small>付费撤离</small><strong>◈ ${money(m.fee)}</strong></div></div><div class="deploy-block">${locked ? `<p>击败上一关首领并成功撤离后解锁。</p>` : !s.equipment.primary ? `<p>需要装备一把主武器。</p>` : `<p>${s.pack.filter((i) => db[i.id].kind === "ammo").reduce((n, i) => n + i.qty, 0)} 发备弹 · ${s.pack.filter((i) => db[i.id].kind === "food").length} 份食物</p>`}${button("开始行动 →", "deploy", locked || !s.equipment.primary || s.overflow.length ? "disabled" : "", "primary full")}${button("检查整备", "nav", 'data-id="loadout"', "text-button full")}</div></section>`;
}
function collection() {
  return `<div class="page-heading"><div><span class="eyebrow">EVERY TREASURE HAS A TAIL</span><h1>收藏图鉴</h1><p>带回过的珍宝会永久点亮。收集不占仓库。</p></div><span class="badge">已发现 ${s.collection.length} / 60</span></div>${[
    1, 2, 3, 4, 5,
  ]
    .map(
      (t) =>
        `<section class="collection-section">${panelTitle(`${rarity[t]} · ${t} 级`, `${s.collection.filter((id) => db[id].tier === t).length}/12`)}<div class="collection-grid">${items
          .filter((d) => d.kind === "collectible" && d.tier === t)
          .map(
            (d) =>
              `<div class="collection-card ${s.collection.includes(d.id) ? "found" : ""}" style="--rarity:${colors[t]}">${icon(d.icon, s.collection.includes(d.id) ? colors[t] : "#7f9181", 48)}<div><strong>${d.name}</strong><small>${s.collection.includes(d.id) ? "已发现" : "未发现"} · ◈ ${money(Math.floor(d.price * 0.65))}</small></div><p>${d.desc}</p></div>`,
          )
          .join("")}</div></section>`,
    )
    .join("")}`;
}
function settings() {
  return `<div class="page-heading"><div><span class="eyebrow">YOUR WAY TO PLAY</span><h1>设置与存档</h1><p>调整到舒服，再继续行动。</p></div>${button("操作指南", "modal", 'data-id="help"', "secondary")}</div><div class="settings-grid"><section class="panel">${panelTitle("声音与画面", "即时生效")}<div class="settings-rows">${[
    ["master", "主音量"],
    ["music", "背景音乐"],
    ["sfx", "音效"],
    ["shake", "屏幕震动"],
  ]
    .map(
      ([id, label]) =>
        `<label>${label}<input type="range" min="0" max="1" step="0.05" value="${s.settings[id as "master"]}" data-setting="${id}"/><output>${Math.round(s.settings[id as "master"] * 100)}%</output></label>`,
    )
    .join(
      "",
    )}<label>瞄准线颜色<input type="color" value="${s.settings.aim}" data-setting="aim"/></label><label>干员代号<input id="name-input" maxlength="24" value="${esc(s.name)}"/></label>${button("保存代号", "name", "", "secondary")}</div></section><section class="panel">${panelTitle("死亡规则", "只能在基地切换")}<div class="mode-choice">${button("<strong>九命归巢</strong><span>轻松 · 死亡保留所有物品，护具耐久照常消耗。</span>", "mode", 'data-id="easy"', s.mode === "easy" ? "selected" : "")}${button("<strong>一命一包</strong><span>标准 · 死亡掉落装备与背包，安全箱内容保留。</span>", "mode", 'data-id="standard"', s.mode === "standard" ? "selected" : "")}</div><p class="muted">${s.easyUsed ? "此存档使用过轻松模式。" : ""} 切换规则不影响主线进度。</p>${button("领取破产救济包", "rescue", "", "secondary full")}<p class="muted">金币少于 1,000 且没有武器时可领取。</p>${s.completed ? button("开启九命周目", "ng", "", "primary full") : ""}</section><section class="panel">${panelTitle("本地存档", "三个独立存档槽")}<div class="save-slots">${slots.map((slot, i) => `<div class="save-slot ${i === s.slot ? "selected" : ""}"><div><strong>存档 ${i + 1}${i === s.slot ? " · 当前" : ""}</strong><small>${slot ? `${esc(slot.name)} · ◈${money(slot.coins)} · ${slot.defeated.length}/6 首领` : "空存档 · 从新干员开始"}</small></div>${button(i === s.slot ? "使用中" : slot ? "载入" : "创建", "slot", `data-id="${i}" ${i === s.slot ? "disabled" : ""}`, "tiny")}</div>`).join("")}</div><div class="button-row">${button("导出当前存档", "export", "", "secondary")}<label class="button secondary">导入存档<input type="file" id="import-save" accept="application/json,.json" hidden/></label></div><p class="muted">存档仅保存在此浏览器。清理浏览器数据前请先导出。</p></section></div>`;
}
function renderModal() {
  if (result) return resultModal(result);
  if (!modal) return "";
  let content = "";
  if (modal === "safe")
    content = `${panelTitle("升级安全箱", "死亡、超时都保留")}<div class="safe-options">${safeNames.map((name, i) => button(`${icon("safe", i <= s.safe ? "#a9b894" : "#ddc285", 54)}<strong>${name}</strong><span>${safeCap[i]} 格</span><small>${i <= s.safe ? "已拥有" : i === 3 && !s.defeated.includes("yeed") ? "击败猫伊德后解锁" : `◈ ${money(safePrice[i])}`}</small>`, "safe", `data-id="${i}" ${i <= s.safe || (i === 3 && !s.defeated.includes("yeed")) ? "disabled" : ""}`)).join("")}</div>`;
  if (modal === "help")
    content = `<span class="eyebrow">新晋 CTI 干员手册</span><h2>搜一点，打一场，带回家。</h2><p>爪洲的大断粮之后，猫晶落入了各地首领的爪中。老爪需要你进入四个区域，击败六名首领，带回猫晶核心。</p><div class="guide-grid">${[
      ["W A S D", "移动"],
      ["Shift", "奔跑"],
      ["Space", "翻滚"],
      ["鼠标左键", "瞄准 / 射击"],
      ["R", "换弹"],
      ["E", "搜索 / 交互"],
      ["F", "吃食物回血"],
      ["Tab", "背包"],
      ["M", "地图"],
      ["1 / 2", "切换武器"],
      ["Esc", "暂停"],
    ]
      .map(([key, t]) => `<div><kbd>${key}</kbd><span>${t}</span></div>`)
      .join(
        "",
      )}</div><div class="hint-box">靠近箱子按 E 搜索，点击已揭示物品拾取。安全箱内物品不会丢失。绿色圈是撤离点，停留 5 秒即可回家。高级物品搜索时间更长，也更值钱。</div>${button("明白了，回到基地", "close-modal", "", "primary full")}`;
  if (modal === "confirm-ng")
    content =
      "<h2>九命周目</h2><p>保留仓库和金币，重置首领与地图进度，敌人变强。</p>" +
      button("开始新周目", "confirm-ng", "", "primary");
  return `<div class="modal-backdrop"><section class="modal panel">${button("×", "close-modal", 'aria-label="关闭"', "modal-close")}${content}</section></div>`;
}
function resultModal(r: Result) {
  return `<div class="modal-backdrop result-backdrop"><section class="modal result-modal"><div class="result-emblem ${r.success ? "" : "failed"}">${icon(r.success ? "paw" : "helmet", r.success ? "#e9cb8e" : "#cda18c", 72)}</div><span class="eyebrow">${r.success ? "WELCOME HOME, OPERATOR" : "EVERY CAT DESERVES ANOTHER CHANCE"}</span><h1>${s.completed && r.success && r.bosses.includes("doctor") ? "行动完成 · 猫晶归巢" : r.success ? "平安归巢" : "九命未尽，下次再来"}</h1><p>${esc(r.reason)} · ${maps[r.map].name}</p><div class="result-stats">${[
    ["行动时间", `${Math.floor(r.time / 60)}分${Math.floor(r.time % 60)}秒`],
    ["击败敌猫", r.kills],
    ["搜索容器", r.searches],
    ["带回价值", `◈${money(r.success || s.mode === "easy" ? r.value : 0)}`],
    ["造成伤害", Math.round(r.damageDealt)],
    ["行动补贴", `◈${r.reward}`],
  ]
    .map(
      ([label, n]) => `<div><small>${label}</small><strong>${n}</strong></div>`,
    )
    .join(
      "",
    )}</div>${r.bosses.length ? `<div class="hint-box">首领进度已保存：${r.bosses.map((id) => bosses.find((b) => b.id === id)?.name).join("、")}。首次击败补贴已到账。</div>` : ""}<p class="muted">${r.success ? "战利品已入库，已装备的武器与护具仍在身上。" : s.mode === "easy" ? "轻松模式：装备、背包与安全箱物品全部保留。" : "标准模式：安全箱已保留，其余物品丢失。可在商店找回同款。"}</p>${button("返回暖窝 →", "close-result", "", "primary full")}</section></div>`;
}
function drawHome() {
  const c = document.querySelector<HTMLCanvasElement>("#base-art");
  if (c) drawBase(c, baseTick);
}
function renderRaid() {
  if (!raid) return;
  const r = raid;
  canvas.classList.remove("hidden");
  document.body.classList.add("in-raid");
  root.innerHTML = `<div class="raid-hud"><div class="raid-top"><div class="raid-location"><small>CTI / 行动中</small><strong>${maps[r.map].name}</strong></div><div class="raid-objective"><span>${r.map === 3 ? "取得权限密钥，击败博士" : "击败区域首领，成功撤离"}</span><small>◇ ${
    r.pendingBosses.length
      ? "信物在身 · 前往撤离"
      : bosses
          .filter((b) => b.map === r.map && !s.defeated.includes(b.id))
          .map((b) => b.name)
          .join(" / ") || "自由搜索"
  }</small></div><button class="raid-timer" data-action="pause"><b id="raid-time">15:00</b><small>ESC 暂停</small></button></div><canvas id="minimap" width="200" height="150" data-action="toggle-map" aria-label="战区小地图，点击展开"></canvas><div class="raid-legend">◇ 首领　<span>●</span> 撤离　M 地图</div><div id="boss-hud"></div><div class="raid-bottom"><div class="vitals"><div class="health-row"><strong id="hp-number">100</strong><span>生命 / 100</span>${icon("paw", "#ddc89b", 24)}</div><div class="meter"><i id="hp-fill"></i></div><div class="stamina-label"><span>体力</span><span id="st-number">160</span></div><div class="meter stamina"><i id="st-fill"></i></div><div class="armor-readout" id="armor-readout"></div></div><div class="raid-keys"><span><kbd>E</kbd>搜索</span><span><kbd>F</kbd>食物</span><span><kbd>Tab</kbd>背包</span><span><kbd>Space</kbd>翻滚</span></div><div class="weapon-hud"><span id="weapon-name"></span><div><strong id="mag-count"></strong><span id="reserve-count"></span></div><small id="ammo-name"></small></div></div><div id="action-progress" class="action-progress hidden"></div><div id="crosshair"></div></div><div id="raid-overlay">${raidOverlay()}</div>`;
  updateHUD();
}
function raidOverlay() {
  if (!raid) return "";
  const r = raid;
  if (r.paused)
    return `<div class="modal-backdrop"><section class="modal pause-modal panel"><span class="eyebrow">TAKE A BREATHER</span><h1>行动暂停</h1><p>时间和战区都已暂停，休息一下。</p>${button("继续行动", "pause", "", "primary full")}${button("操作指南", "raid-help", "", "secondary full")}${button("放弃行动并按死亡结算", "abandon", "", "text-button full")}</section></div>`;
  if (r.mapOpen)
    return `<div class="modal-backdrop map-backdrop"><section class="modal large-map panel">${panelTitle(maps[r.map].name, "金色：你 · 绿色：撤离 · 橙色：Boss")}<canvas id="full-map" width="960" height="720"></canvas>${button("关闭地图 · M", "toggle-map", "", "secondary full")}</section></div>`;
  if (r.puzzle)
    return `<div class="puzzle-panel panel">${button("×", "close-raid", 'aria-label="关闭保险箱"', "modal-close")}<span class="eyebrow">SAFE / 小小算术，大大宝藏</span><h2>保险箱验证</h2><div class="math-expression">${r.puzzle.text}</div><div class="math-choices">${r.puzzle.choices.map((v, i) => button(`<small>${i + 1}</small>${v}`, "answer", `data-id="${v}"`)).join("")}</div><p>答错会发出警报。战区仍在运行，注意身后。</p></div>`;
  if (r.search)
    return `<section class="loot-panel panel">${button("×", "close-raid", 'aria-label="关闭搜索"', "modal-close")}${panelTitle(r.search.name, `${r.search.revealed}/${r.search.items.length} 已揭示`)}<p>点击拾取 · 按住 Shift 点击放入安全箱</p><div class="item-grid loot-grid">${r.search.items.map((i, n) => (n < r.search!.revealed ? `<div class="loot-cell">${itemCard(i, "loot")}<button class="secure-pick" data-action="take-safe" data-id="${n}" aria-label="放入安全箱">◇</button></div>` : `<div class="unrevealed" data-search-index="${n}"><span class="search-ring ${n === r.search!.revealed ? "spinning" : ""}"></span><span>${n === r.search!.revealed ? "搜索中" : "等待搜索"}</span></div>`)).join("")}</div><div class="loot-footer"><span>背包 ${s.pack.length}/${packCapacity(s)} · 安全箱 ${s.secure.length}/${safeCap[s.safe]}</span>${button("拾取已揭示", "take-all", "", "tiny")}</div></section>`;
  if (r.inventory)
    return `<section class="raid-inventory panel">${button("×", "close-raid", 'aria-label="关闭背包"', "modal-close")}${panelTitle("战术背包", `${s.pack.length}/${packCapacity(s)} 格`)}<p>点击物品可操作，战区仍在运行。</p><div class="item-grid compact">${s.pack.map((i) => `<div class="raid-item">${itemIcon(i, 45)}<strong>${db[i.id].name}${db[i.id].kind === "ammo" ? ` ×${i.qty}` : ""}</strong><div>${db[i.id].kind === "ammo" ? button("装填", "raid-ammo", `data-id="${db[i.id].tier}"`, "tiny") : db[i.id].kind === "food" ? button("食用", "raid-eat", `data-id="${i.uid}"`, "tiny") : ["weapon", "armor", "helmet", "bag"].includes(db[i.id].kind) ? button("装备", "raid-equip", `data-id="${i.uid}"`, "tiny") : ""}${button("保护", "raid-protect", `data-id="${i.uid}"`, "tiny")}${button("丢弃", "drop", `data-id="${i.uid}"`, "tiny danger")}</div></div>`).join("")}</div>${panelTitle(safeNames[s.safe], `${s.secure.length}/${safeCap[s.safe]} 格 · 死亡保留`)}<div class="item-grid compact">${s.secure.map((i) => `<div class="raid-item">${itemIcon(i, 40)}<strong>${db[i.id].name}</strong>${button("移回背包", "raid-unprotect", `data-id="${i.uid}"`, "tiny")}</div>`).join("")}</div><p class="muted">当前弹药：${db[`m${r.ammoTier}`].name}。按 1 / 2 切换已装备武器。</p></section>`;
  return "";
}
function overlay() {
  const el = document.querySelector("#raid-overlay");
  if (el) el.innerHTML = raidOverlay();
}
function updateHUD() {
  if (!raid || raid.done) return;
  const r = raid,
    p = r.p;
  const set = (id: string, value: string) => {
    const e = document.getElementById(id);
    if (e) e.textContent = value;
  };
  set(
    "raid-time",
    `${Math.floor(r.time / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor(r.time % 60)
      .toString()
      .padStart(2, "0")}`,
  );
  document
    .querySelector(".raid-timer")
    ?.classList.toggle("warning", r.time < 300);
  set("hp-number", String(Math.max(0, Math.ceil(p.hp))));
  set("st-number", String(Math.ceil(p.stamina)));
  const hp = document.getElementById("hp-fill"),
    st = document.getElementById("st-fill");
  if (hp) hp.style.width = `${Math.max(0, p.hp)}%`;
  if (st) st.style.width = `${(p.stamina / 160) * 100}%`;
  set("weapon-name", r.weapon?.name || "未装备武器");
  set("mag-count", String(r.mag).padStart(2, "0"));
  set("reserve-count", ` / ${r.reserve}`);
  set(
    "ammo-name",
    `${db[`m${r.ammoTier}`].name} · ${r.reload ? "换弹中" : r.activeWeapon === "primary" ? "主武器" : "副武器"}`,
  );
  set(
    "armor-readout",
    `甲 ${Math.ceil(s.equipment.armor?.durability ?? 0)}　盔 ${Math.ceil(s.equipment.helmet?.durability ?? 0)}　背包 ${s.pack.length}/${packCapacity(s)}`,
  );
  const action = document.getElementById("action-progress");
  if (action) {
    if (r.extract || r.heal || r.reload) {
      action.classList.remove("hidden");
      const progress = r.extract
        ? r.extract / 5
        : r.heal
          ? 1 - r.heal / r.healDuration
          : 1 - r.reload / (r.weapon?.reload || 2);
      action.innerHTML = `<span>${r.extract ? `正在撤离 · ${(5 - r.extract).toFixed(1)} 秒` : r.heal ? "进食中 · 受击或奔跑会打断" : "换弹中"}</span><div class="meter"><i style="width:${progress * 100}%"></i></div>`;
    } else action.classList.add("hidden");
  }
  const b = r.enemies.find(
      (e) =>
        e.boss &&
        e.state === "combat" &&
        Math.hypot(e.x - p.x, e.y - p.y) < 850,
    ),
    bossHUD = document.getElementById("boss-hud");
  if (bossHUD)
    bossHUD.innerHTML = b
      ? `<span>${b.boss!.name}${b.phase ? " · 第二阶段" : ""}</span><div class="meter"><i style="width:${(b.hp / b.maxHp) * 100}%"></i></div>`
      : "";
  const mm = document.querySelector<HTMLCanvasElement>("#minimap");
  if (mm) miniMap(mm, r);
  const full = document.querySelector<HTMLCanvasElement>("#full-map");
  if (full) miniMap(full, r, true);
}
function deploy() {
  if (mapIndex > unlocked(s) || !s.equipment.primary || s.overflow.length)
    return;
  modal = "";
  keys.clear();
  mouse.down = false;
  raid = new Raid(
    s,
    mapIndex,
    sound,
    () => overlay(),
    (r) => {
      result = r;
      slots[s.slot] = structuredClone(s);
      page = "home";
      render();
    },
    toast,
  );
  renderRaid();
  toast("行动开始 · E 搜索 · M 查看撤离点 · Esc 暂停");
}
function refresh() {
  slots[s.slot] = structuredClone(s);
  render();
}
function doMove(to: "stash" | "pack" | "secure") {
  if (!selected) return;
  if (!move(s, selected.from, to, selected.uid)) toast("目标空间不足");
  else {
    selected = undefined;
    toast("物品已转移");
  }
  refresh();
}
async function action(el: HTMLElement, event: MouseEvent) {
  const a = el.dataset.action,
    id = el.dataset.id;
  sound.start();
  sound.play("click");
  if (a === "nav") {
    page = id!;
    selected = undefined;
    modal = "";
    await refreshSlots();
    render();
  } else if (a === "modal") {
    modal = id!;
    render();
  } else if (a === "close-modal") {
    modal = "";
    s.tutorial = true;
    persist(s);
    render();
  } else if (a === "category") {
    category = id!;
    render();
  } else if (a === "select") {
    if (raid && !raid.done && el.dataset.from === "loot") {
      const index = raid.search?.items.findIndex((i) => i.uid === id) ?? -1;
      if (index >= 0) raid.take(index, event.shiftKey);
      return;
    }
    selected = { from: el.dataset.from as "stash", uid: id! };
    const detail = document.querySelector(".details-panel");
    if (detail) {
      detail.innerHTML =
        details() +
        button("前往战区 →", "nav", 'data-id="maps"', "primary full");
      document
        .querySelectorAll(".item-card.selected")
        .forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
    } else render();
  } else if (a === "move") doMove(el.dataset.to as "pack");
  else if (a === "equip" || a === "equip-secondary") {
    if (selected && selected.from !== "secure") {
      if (!equip(s, selected.from, selected.uid, a === "equip-secondary"))
        toast("装备失败 · 检查背包空间");
      selected = undefined;
      refresh();
    }
  } else if (a === "unequip") {
    const slot = id as keyof Equipment,
      i = s.equipment[slot];
    if (i) {
      if (s.stash.length >= capacities[s.warehouse]) return toast("仓库已满");
      if (slot === "bag" && s.pack.length > 8)
        return toast("请先将背包整理到 8 格以内");
      s.stash.push(i);
      s.equipment[slot] = null;
      persist(s);
      refresh();
    }
  } else if (a === "buy") {
    if (buy(s, id!)) {
      toast(`已购买 ${db[id!].name} · 已放入仓库`);
      refresh();
    } else toast("无法购买 · 检查金币、仓库空间与解锁条件");
  } else if (a === "buyback") {
    toast(
      buyBack(s, id!)
        ? "同款装备已购入仓库"
        : "无法购买 · 检查金币、空间和解锁条件",
    );
    refresh();
  } else if (a === "sell") {
    if (
      selected &&
      (selected.from === "stash" || selected.from === "overflow")
    ) {
      const price = sell(s, selected.from, selected.uid);
      selected = undefined;
      toast(`出售成功 · +${money(price)} 金币`);
      refresh();
    }
  } else if (a === "sell-all") {
    const loot = s.stash.filter((i) => db[i.id].kind === "collectible");
    let sum = 0;
    loot.forEach((i) => (sum += sell(s, "stash", i.uid)));
    toast(`出售 ${loot.length} 件收集品 · +${money(sum)} 金币`);
    refresh();
  } else if (a === "warehouse") {
    if (upgradeWarehouse(s)) toast("仓库扩建完成");
    else toast("金币不足");
    refresh();
  } else if (a === "safe") {
    if (upgradeSafe(s, Number(id))) {
      toast("安全箱已升级");
      modal = "";
    } else toast("金币不足或尚未解锁");
    refresh();
  } else if (a === "repair") {
    if (repair(s, id as "armor")) toast("修复完成 · 最大耐久略微降低");
    else toast("无需修复或金币不足");
    refresh();
  } else if (a === "map-select") {
    mapIndex = Number(id);
    render();
  } else if (a === "deploy") deploy();
  else if (a === "mode") {
    s.mode = id as "easy";
    if (id === "easy") s.easyUsed = true;
    persist(s);
    refresh();
  } else if (a === "name") {
    s.name = (
      document.querySelector<HTMLInputElement>("#name-input")?.value.trim() ||
      "三花七号"
    ).slice(0, 24);
    persist(s);
    refresh();
  } else if (a === "rescue") {
    toast(rescue(s) ? "救济包已发放，去整备吧" : "当前不符合救济条件");
    refresh();
  } else if (a === "slot") {
    const i = Number(id);
    s = (await load(i)) || newSave(i);
    recoverInterrupted(s);
    persist(s);
    sound.settings = s.settings;
    sound.apply();
    await refreshSlots();
    render();
  } else if (a === "export") {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `三角猫行动-存档${s.slot + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (a === "preset") {
    preset(Number(id));
  } else if (a === "close-result") {
    result = undefined;
    raid = undefined;
    s.result = undefined;
    persist(s);
    refresh();
  } else if (a === "pause") {
    if (raid) {
      raid.paused = !raid.paused;
      keys.clear();
      mouse.down = false;
      overlay();
    }
  } else if (a === "toggle-map") {
    if (raid) {
      raid.mapOpen = !raid.mapOpen;
      raid.inventory = false;
      raid.interrupt();
      overlay();
    }
  } else if (a === "close-raid") {
    if (raid) {
      raid.interrupt();
      raid.inventory = false;
      overlay();
    }
  } else if (a === "answer") raid?.answer(Number(id));
  else if (a === "take-safe") raid?.take(Number(id), true);
  else if (a === "take-all") {
    if (raid?.search) {
      let n = raid.search.revealed;
      while (n-- > 0) raid.take(n, false);
    }
  } else if (a === "raid-protect") {
    if (!move(s, "pack", "secure", id!)) toast("安全箱已满");
    overlay();
  } else if (a === "raid-unprotect") {
    if (!move(s, "secure", "pack", id!)) toast("背包已满");
    overlay();
  } else if (a === "drop") {
    const item = s.pack.find((i) => i.uid === id);
    if (item && raid) {
      s.pack = s.pack.filter((i) => i !== item);
      raid.containers.push({
        x: raid.p.x + 35,
        y: raid.p.y,
        name: "丢下的物品",
        type: "corpse",
        items: [item],
        revealed: 1,
        open: true,
        locked: false,
        cooldown: 0,
      });
      persist(s);
      overlay();
    }
  } else if (a === "raid-ammo") {
    raid?.switchAmmo(Number(id));
    overlay();
  } else if (a === "raid-eat") {
    raid?.useFood(id);
  } else if (a === "raid-equip") {
    if (raid) {
      toast(
        raid.equipLoot(id!)
          ? "装备完成 · 拾获武器放入副武器栏"
          : "空间不足，无法更换装备",
      );
      overlay();
    }
  } else if (a === "abandon") {
    raid?.finish(false, "主动撤回基地");
  } else if (a === "raid-help") {
    toast(
      "WASD 移动 · Shift 奔跑 · Space 翻滚 · 左键射击 · E 搜索 · R 换弹 · F 食物 · Tab 背包 · M 地图",
    );
  } else if (a === "ng") {
    modal = "confirm-ng";
    render();
  } else if (a === "confirm-ng") {
    s.ng++;
    s.completed = false;
    s.defeated = [];
    s.coins += 15000;
    persist(s);
    modal = "";
    refresh();
  }
}
function preset(level: number) {
  const ids =
    level === 0
      ? ["w0", "a1", "h1", "b1", "m1", "m1", "m1", "f1", "f1"]
      : level === 1
        ? ["w3", "a2", "h2", "b2", "m2", "m2", "m2", "f2", "f2"]
        : ["w7", "a4", "h4", "b4", "m3", "m3", "m3", "f3", "f3"];
  const cost = ids.reduce((n, id) => n + db[id].price, 0);
  if (s.coins < cost) return toast(`需要 ${money(cost)} 金币`);
  if (ids.some((id) => unlocked(s) < (db[id].unlock ?? 0)))
    return toast("部分装备尚未解锁");
  if (
    s.stash.length +
      Object.values(s.equipment).filter(Boolean).length +
      s.pack.length >
    capacities[s.warehouse]
  )
    return toast("请先整理仓库");
  for (const i of Object.values(s.equipment)) if (i) s.stash.push(i);
  s.stash.push(...s.pack);
  s.pack = [];
  s.equipment = {
    primary: makeItem(ids[0]),
    secondary: null,
    armor: makeItem(ids[1]),
    helmet: makeItem(ids[2]),
    bag: makeItem(ids[3]),
  };
  s.pack = ids
    .slice(4)
    .map((id) => makeItem(id, db[id].kind === "ammo" ? 30 : 1));
  s.coins -= cost;
  persist(s);
  toast(`整备完成 · 花费 ${money(cost)} 金币`);
  refresh();
}
async function refreshSlots() {
  slots = await Promise.all([0, 1, 2].map((i) => load(i)));
}
root.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (el && !el.hasAttribute("disabled")) {
    e.preventDefault();
    void action(el, e as MouseEvent);
  }
});
root.addEventListener("dblclick", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>(".item-card");
  if (el && !raid && el.dataset.from !== "shop") {
    selected = { from: el.dataset.from as "stash", uid: el.dataset.id! };
    if (selected.from !== "secure") equip(s, selected.from, selected.uid);
    selected = undefined;
    refresh();
  }
});
root.addEventListener("input", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.dataset.setting) {
    const id = input.dataset.setting as keyof Save["settings"];
    if (id === "aim") s.settings.aim = input.value;
    else s.settings[id] = Number(input.value);
    sound.apply();
    const output = input.parentElement?.querySelector("output");
    if (output)
      output.textContent = `${Math.round(Number(input.value) * 100)}%`;
    persist(s);
  }
});
root.addEventListener("change", async (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === "filter") {
    filter = input.value;
    render();
  } else if (input.id === "sort") {
    sort = input.value;
    render();
  } else if (input.id === "import-save" && input.files?.[0]) {
    try {
      if (input.files[0].size > 2e6) throw Error("文件过大");
      const imported = validateSave(JSON.parse(await input.files[0].text()));
      imported.slot = s.slot;
      imported.updated = Date.now();
      s = imported;
      recoverInterrupted(s);
      persist(s);
      sound.settings = s.settings;
      sound.apply();
      await refreshSlots();
      toast("存档导入成功");
      render();
    } catch {
      toast("导入失败 · 存档损坏或格式不支持");
    }
  }
});
root.addEventListener("dragstart", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[draggable]");
  if (el) {
    (e as DragEvent).dataTransfer?.setData(
      "text/plain",
      JSON.stringify({ from: el.dataset.from, uid: el.dataset.id }),
    );
  }
});
root.addEventListener("dragover", (e) => {
  if ((e.target as HTMLElement).closest("[data-drop]")) e.preventDefault();
});
root.addEventListener("drop", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-drop]");
  if (!el) return;
  e.preventDefault();
  try {
    const data = JSON.parse(
      (e as DragEvent).dataTransfer!.getData("text/plain"),
    );
    selected = data;
    doMove(el.dataset.drop as "pack");
  } catch {}
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,select,textarea")) return;
  if (["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code))
    e.preventDefault();
  if (!raid || raid.done) {
    if (e.code === "Escape") {
      modal = "";
      render();
    }
    return;
  }
  const r = raid;
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === "Escape") {
    if (r.search || r.puzzle || r.inventory || r.mapOpen) {
      r.interrupt();
      r.inventory = false;
      r.mapOpen = false;
    } else r.paused = !r.paused;
    mouse.down = false;
    keys.clear();
    overlay();
    return;
  }
  if (r.paused) return;
  if (r.puzzle && ["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
    r.answer(r.puzzle.choices[Number(e.code.at(-1)) - 1]);
    return;
  }
  if (e.code === "Space")
    r.roll(
      (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0),
    );
  if (e.code === "KeyE") r.interact();
  if (e.code === "KeyR") r.loadMagazine();
  if (e.code === "KeyF") r.useFood();
  if (e.code === "Tab") {
    r.inventory = !r.inventory;
    r.search = undefined;
    r.puzzle = undefined;
    r.mapOpen = false;
    overlay();
  }
  if (e.code === "KeyM") {
    r.mapOpen = !r.mapOpen;
    r.inventory = false;
    r.interrupt();
    overlay();
  }
  if (
    (e.code === "Digit1" && r.activeWeapon !== "primary") ||
    (e.code === "Digit2" && r.activeWeapon !== "secondary")
  )
    r.switchWeapon();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("pagehide", () => {
  if (s) persist(s);
});
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  const cross = document.querySelector<HTMLElement>("#crosshair");
  if (cross) {
    cross.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    cross.style.borderColor = s.settings.aim;
  }
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 0) {
    mouse.down = true;
    sound.start();
  }
});
window.addEventListener("pointerup", () => (mouse.down = false));
window.addEventListener("blur", () => {
  keys.clear();
  mouse.down = false;
  if (raid && !raid.done) {
    raid.paused = true;
    overlay();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && raid && !raid.done) {
    raid.paused = true;
    keys.clear();
    mouse.down = false;
    overlay();
  }
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    raid?.switchWeapon();
  },
  { passive: false },
);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());
async function boot() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  }
  await initDB();
  s = (await load(0)) || newSave(0);
  recoverInterrupted(s);
  persist(s);
  await refreshSlots();
  sound = new Sound(s.settings);
  renderer = new Renderer(canvas);
  if (!s.tutorial) modal = "help";
  if (s.result) result = s.result;
  class Loop extends Phaser.Scene {
    constructor() {
      super("Action");
    }
    update(_time: number, delta: number) {
      baseTick += delta / 1000;
      if (raid && !raid.done) {
        const p = renderer.screenToWorld(pointer.x, pointer.y);
        mouse.x = p.x;
        mouse.y = p.y;
        raid.update(delta / 1000, keys, mouse);
        if (performance.now() - lastHUD > 80) {
          updateHUD();
          lastHUD = performance.now();
        }
      } else if (page === "home") drawHome();
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
    if (raid && !raid.done) renderer.raid(raid);
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
          return renderer;
        },
        deploy,
        render,
        toast,
        selectMap: (n: number) => {
          mapIndex = n;
        },
        setSave: (v: Save) => {
          s = v;
          sound.settings = s.settings;
          render();
        },
        get sound() {
          return sound;
        },
      },
    });
}
void boot();
