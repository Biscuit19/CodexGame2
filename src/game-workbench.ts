import "./game-workbench.css";
import {
  catalog,
  itemCatalog,
  itemRange,
  fieldNames,
  containerNames,
  currentContainers,
  publishedTuning,
  validateTuning,
  type Tuning,
  type NumberEntry,
  itemLabel,
} from "./game-catalog";
import { editableItemFields } from "./game-tuning-runtime";
import { defaultBalance, parseBalance } from "./audio-balance";
import { timestampSuffix } from "./config-time";
import { defaults } from "./store";
import { sampleBank } from "./audio-samples";
import { kindNames, SALE_RATIO, type ItemDef } from "./data";
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const storageKey = "tricat-game-workbench-" + catalog.fingerprint;
let tuning: Tuning = structuredClone(publishedTuning),
  savedAudio: any,
  section = "weapons",
  page = 0,
  perPage = 35,
  dirty = false,
  commit = "";
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (saved) {
    tuning = validateTuning(saved.tuning);
    if (saved.audio) savedAudio = parseBalance(saved.audio);
    dirty = true;
  }
} catch {}
const frame = $("mixer") as HTMLIFrameElement;
const requests = new Map<
  string,
  {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
    timer: number;
    retry: number;
  }
>();
let serial = 0;
function status(text: string, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}
function persist() {
  dirty = true;
  $("dirty").textContent = "已有草稿修改";
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ tuning, audio: savedAudio }),
    );
  } catch {
    status("浏览器未允许保存草稿，请及时导出");
  }
}
function askMixer(action: string, profile?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = "workbench-" + ++serial;
    const timer = window.setTimeout(() => {
      const old = requests.get(id);
      if (old) clearInterval(old.retry);
      requests.delete(id);
      reject(Error("调音台尚未准备完成，请稍后重试"));
    }, 8000);
    const send = () =>
      frame.contentWindow?.postMessage(
        { kind: "tricat-mixer-request", id, action, profile },
        location.origin,
      );
    const retry = window.setInterval(send, 200);
    requests.set(id, { resolve, reject, timer, retry });
    frame.contentWindow?.postMessage(
      { kind: "tricat-mixer-request", id, action, profile },
      location.origin,
    );
  });
}
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    e.source !== frame.contentWindow ||
    !e.data
  )
    return;
  if (e.data.kind === "tricat-mixer-reply") {
    const request = requests.get(e.data.id);
    if (request) {
      clearTimeout(request.timer);
      clearInterval(request.retry);
      requests.delete(e.data.id);
      if (e.data.error) request.reject(Error(e.data.error));
      else request.resolve(e.data.profile);
    }
  } else if (e.data.kind === "tricat-mixer-changed") {
    try {
      savedAudio = e.data.profile;
      parseBalance(savedAudio);
      persist();
    } catch {}
  }
});
frame.addEventListener("load", async () => {
  if (savedAudio)
    try {
      await askMixer("set", savedAudio);
    } catch (e) {
      status((e as Error).message, true);
    }
});
const tabs = [
  ["weapons", "武器与近战"],
  ["food", "补给品"],
  ["equipment", "装备与背包"],
  ["ammo", "弹药"],
  ["collectibles", "收集品价值"],
  ["shop", "商品价格"],
  ["containers", "容器数量与爆率"],
  ["基础规则", "移动与基础规则"],
  ["战斗与敌人", "战斗与敌人AI"],
  ["经济与整备", "经济与整备"],
  ["乡野布局", "乡野与关卡"],
  ["角色移动", "移动动作"],
  ["容器交互", "容器交互"],
  ["近战动作", "近战动作"],
  ["换弹动作", "换弹动作"],
  ["all-rules", "全部细项规则"],
  ["audio", "全音效调音台"],
];
for (const [id, name] of tabs) {
  const b = document.createElement("button");
  b.textContent = name;
  b.dataset.tab = id;
  b.onclick = () => {
    section = id;
    page = 0;
    ($("search") as HTMLInputElement).value = "";
    ($("scope") as HTMLSelectElement).value = "";
    render();
  };
  $("tabs").append(b);
}
const valueOf = (e: NumberEntry) => tuning.numbers[e.id]?.value ?? e.base;
const effective = (item: ItemDef) => ({ ...item, ...tuning.items[item.id] });
const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : Number(n.toPrecision(9)).toString();
const changed = (item: ItemDef, field: string) =>
  effective(item)[field as keyof ItemDef] !== item[field as keyof ItemDef];
function draftSaleRatio() {
  const e = catalog.entries.find((n) => n.label === "出售折算比例");
  return e ? valueOf(e) : SALE_RATIO;
}
function fieldInput(item: ItemDef, field: string) {
  const current = effective(item),
    raw = Number((current as any)[field]),
    base = Number((item as any)[field]);
  const factor =
    field === "spread"
      ? (360 / Math.PI) * ((current.pellets ?? 1) > 1 ? 1.075 : 1)
      : field === "rpm"
        ? 1 / 60
        : 1;
  const unit =
    field === "spread"
      ? "°"
      : field === "rpm"
        ? "次/秒"
        : ["reload", "healSeconds", "useTime"].includes(field)
          ? "秒"
          : field === "price" || field === "buyPrice"
            ? "金币"
            : field === "capacity"
              ? "格"
              : "";
  const range = itemRange(field, item);
  return `<label class="field ${changed(item, field) ? "modified" : ""}"><span>${esc(fieldNames[field])}<small>${esc(unit)}</small></span><input type="number" data-item="${item.id}" data-field="${field}" aria-label="${esc(item.name + " / " + fieldNames[field])}" value="${raw * factor}" min="${range.min * factor}" max="${range.max * factor}" step="${range.integer ? "1" : "any"}" data-factor="${factor}"><small>当前发布：${fmt(base * factor)} ${esc(unit)}</small></label>`;
}
function itemRows() {
  let list = itemCatalog.filter((i) =>
    section === "weapons"
      ? ["weapon", "melee"].includes(i.kind)
      : section === "equipment"
        ? ["armor", "helmet", "bag"].includes(i.kind)
        : section === "collectibles"
          ? i.kind === "collectible"
          : section === "shop"
            ? i.kind !== "collectible" && i.kind !== "melee"
            : i.kind === section,
  );
  const q = ($("search") as HTMLInputElement).value.toLowerCase();
  if (q)
    list = list.filter((i) =>
      (i.name + " " + i.id + " " + itemLabel(i)).toLowerCase().includes(q),
    );
  if (($("only-changes") as HTMLInputElement).checked)
    list = list.filter((i) =>
      Object.keys(tuning.items[i.id] ?? {}).some((f) => changed(i, f)),
    );
  const start = page * perPage;
  const shown = list.slice(start, start + perPage);
  $("content").innerHTML =
    `<div class="section-title"><h2>${tabs.find((t) => t[0] === section)?.[1]}</h2><span>${list.length}项</span></div>` +
    shown
      .map((item) => {
        const current = effective(item);
        let fields = editableItemFields.filter(
          (f) =>
            typeof (item as any)[f] === "number" &&
            (item.kind !== "collectible" ||
              !["buyPrice", "shopLimit"].includes(f)),
        );
        if (section === "shop")
          fields = ["buyPrice", "shopLimit", "unlock", "price"];
        return `<details class="panel item-card" data-item-card="${item.id}"><summary><span class="item-token">${esc(itemLabel(item))}</span><strong>${esc(item.name)}</strong><small>${item.id} · ${current.tier}级 · 基础价值 ${fmt(current.price)} · 可售 ${Math.floor(current.price * draftSaleRatio())}金币${current.damage !== undefined ? " · 伤害 " + current.damage : ""}</small><span class="expand">调整 ▾</span></summary><div class="fields">${fields.map((f) => fieldInput(item, f)).join("")}</div><button data-reset-item="${item.id}">恢复这件物品</button></details>`;
      })
      .join("");
  paginate(list.length);
  bindFields();
}
function ruleRow(e: NumberEntry) {
  const v = valueOf(e),
    factor = e.unit === "%" ? 100 : 1,
    isChanged = v !== e.value;
  return `<article class="rule-row ${isChanged ? "modified" : ""}" data-rule="${e.id}"><div><label for="r-${e.id}">${esc(e.label)}</label><p>当前发布：${fmt(e.value * factor)} ${e.unit}</p><details><summary>查看规则上下文</summary><code>${esc(e.description)}</code><small>${esc(e.source)}:${e.line}</small></details></div><div class="number-control"><input id="r-${e.id}" aria-label="${esc(e.label)}" type="number" data-number="${e.id}" data-factor="${factor}" value="${v * factor}" min="${e.min * factor}" max="${e.max * factor}" step="${e.integer ? "1" : "any"}"><span>${e.unit}</span><button data-reset-number="${e.id}" aria-label="恢复 ${esc(e.label)}">↶</button></div></article>`;
}
function rules() {
  const q = ($("search") as HTMLInputElement).value.toLowerCase(),
    scope = ($("scope") as HTMLSelectElement).value;
  let entries = catalog.entries.filter(
    (e) => section === "all-rules" || e.category === section,
  );
  if (q)
    entries = entries.filter((e) =>
      (e.label + " " + e.description).toLowerCase().includes(q),
    );
  if (scope) entries = entries.filter((e) => e.scope === scope);
  if (($("only-changes") as HTMLInputElement).checked)
    entries = entries.filter((e) => valueOf(e) !== e.value);
  $("content").innerHTML =
    `<section class="panel"><h2>${esc(tabs.find((t) => t[0] === section)?.[1] ?? section)}</h2><p>${entries.length}个当前规则。右侧可直接输入数值；名称相近时，可展开上下文确认作用位置。</p>${entries
      .slice(page * perPage, (page + 1) * perPage)
      .map(ruleRow)
      .join("")}</section>`;
  paginate(entries.length);
  bindFields();
}
function containers() {
  const groups = new Map<string, NumberEntry[]>();
  for (const e of catalog.entries)
    if (e.probabilityGroup) {
      const a = groups.get(e.probabilityGroup) ?? [];
      a.push(e);
      groups.set(e.probabilityGroup, a);
    }
  const q = ($("search") as HTMLInputElement).value;
  let out =
    '<section class="panel"><h2>每个容器的基础物品数量</h2><p>武器箱、医疗箱等可能有保底内容；其他地图还可能追加弹药。普通/首领战利品盒由敌人死亡掉落规则决定，详见下方规则。</p><div class="fields">' +
    Object.entries(currentContainers)
      .filter(([k]) => !q || containerNames[k].includes(q))
      .map(
        ([type, count]) =>
          `<label class="field"><span>${containerNames[type]}</span><input type="number" data-container="${type}" aria-label="${containerNames[type]}物品数量" min="1" max="30" step="1" value="${tuning.containers[type] ?? count}"><small>当前发布：${count}件</small></label>`,
      )
      .join("") +
    "</div></section>";
  out +=
    '<section class="panel"><h2>收集品稀有度分布</h2><p>这些概率仅对容器已选中“收集品”的格位生效，不等于所有格子都会掉收集品。每组总和必须为100%，可以先调整多项再导出。</p></section>';
  for (const [group, entries] of groups) {
    if (q && !entries.some((e) => e.label.includes(q))) continue;
    const label = entries[0].label.replace(/ \/ 第\d+项$/, "");
    const sum = entries.reduce((n, e) => n + valueOf(e), 0);
    out += `<section class="panel probability-card"><h3>${esc(label)}</h3><div class="fields probability-fields">${entries.map((e, i) => `<label class="field"><span>${i + 1}级</span><input type="number" data-number="${e.id}" data-factor="100" aria-label="${esc(label + " / " + (i + 1) + "级概率")}" min="0" max="100" step="any" value="${valueOf(e) * 100}"><small>当前发布：${fmt(e.value * 100)}%</small></label>`).join("")}</div><p data-probability-sum="${esc(group)}" class="${Math.abs(sum - 1) > 1e-6 ? "error" : ""}">合计 ${fmt(sum * 100)}%</p><button data-normalize="${esc(group)}">按当前比例归一到100%</button></section>`;
  }
  const remaining = catalog.entries.filter(
    (e) =>
      e.category === "容器与掉落" &&
      !e.probabilityGroup &&
      (!q || (e.label + " " + e.description).includes(q)),
  );
  out += `<section class="panel"><h2>容器生成、食物/武器/弹药分支与战利品规则</h2><p>这里保留游戏现有条件顺序。条件阈值不等于独立概率；展开上下文可以核对前置分支。</p>${remaining
    .slice(page * perPage, (page + 1) * perPage)
    .map(ruleRow)
    .join("")}</section>`;
  $("content").innerHTML = out;
  paginate(remaining.length);
  bindFields();
}
function paginate(total: number) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (page >= pages) {
    page = pages - 1;
    render();
    return;
  }
  const nav = document.createElement("div");
  nav.className = "pagination";
  nav.innerHTML = `<button id="prev" ${page === 0 ? "disabled" : ""}>上一页</button><span>${page + 1} / ${pages}</span><button id="next" ${page + 1 >= pages ? "disabled" : ""}>下一页</button>`;
  $("content").append(nav);
  $("prev").onclick = () => {
    page--;
    render();
  };
  $("next").onclick = () => {
    page++;
    render();
  };
}
function render() {
  document.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === section);
    b.setAttribute(
      "aria-current",
      b.dataset.tab === section ? "page" : "false",
    );
  });
  const isAudio = section === "audio";
  $("audio-pane").hidden = !isAudio;
  $("filters").hidden = isAudio;
  $("content").hidden = isAudio;
  $("overview").hidden = isAudio;
  const sel = $("scope") as HTMLSelectElement,
    old = sel.value;
  sel.replaceChildren(new Option("全部", ""));
  for (const scope of [
    ...new Set(
      catalog.entries
        .filter((e) => section === "all-rules" || e.category === section)
        .map((e) => e.scope),
    ),
  ])
    sel.append(
      new Option(
        catalog.entries.find((e) => e.scope === scope)?.label.split(" / ")[0] ||
          scope,
        scope,
      ),
    );
  sel.value = [...sel.options].some((o) => o.value === old) ? old : "";
  if (isAudio) return;
  ($("scope").parentElement as HTMLElement).hidden = [
    "weapons",
    "food",
    "equipment",
    "ammo",
    "collectibles",
    "shop",
    "containers",
  ].includes(section);
  if (
    ["weapons", "food", "equipment", "ammo", "collectibles", "shop"].includes(
      section,
    )
  )
    itemRows();
  else if (section === "containers") containers();
  else rules();
  $("dirty").textContent = dirty ? "已有草稿修改" : "尚未修改";
}
function bindFields() {
  for (const input of $("content").querySelectorAll<HTMLInputElement>(
    "input[type=number]",
  ))
    input.onchange = () => {
      const value = input.valueAsNumber / factorOf(input);
      if (!Number.isFinite(value) || !input.checkValidity()) {
        input.classList.add("invalid");
        status("请输入范围内的有效数值", true);
        return;
      }
      input.classList.remove("invalid");
      const id = input.dataset.number;
      if (id) {
        const e = catalog.entries.find((e) => e.id === id)!;
        if (value === e.base) delete tuning.numbers[id];
        else tuning.numbers[id] = { base: e.base, value };
        input
          .closest(".rule-row")
          ?.classList.toggle("modified", value !== e.value);
        if (e.probabilityGroup) {
          const group = catalog.entries.filter(
              (n) => n.probabilityGroup === e.probabilityGroup,
            ),
            sum = group.reduce((n, e) => n + valueOf(e), 0),
            out = [
              ...document.querySelectorAll<HTMLElement>(
                "[data-probability-sum]",
              ),
            ].find((x) => x.dataset.probabilitySum === e.probabilityGroup);
          if (out) {
            out.textContent = "合计 " + fmt(sum * 100) + "%";
            out.classList.toggle("error", Math.abs(sum - 1) > 1e-6);
          }
        }
      } else if (input.dataset.item) {
        const id = input.dataset.item,
          field = input.dataset.field!;
        tuning.items[id] ??= {};
        tuning.items[id][field] = value;
        input.closest(".field")?.classList.add("modified");
      } else if (input.dataset.container)
        tuning.containers[input.dataset.container] = value;
      persist();
      status("草稿已保存，导出后可用于更新游戏");
    };
  for (const b of $("content").querySelectorAll<HTMLButtonElement>(
    "[data-reset-item]",
  ))
    b.onclick = () => {
      const id = b.dataset.resetItem!;
      if (publishedTuning.items[id])
        tuning.items[id] = structuredClone(publishedTuning.items[id]);
      else delete tuning.items[id];
      persist();
      render();
    };
  for (const b of $("content").querySelectorAll<HTMLButtonElement>(
    "[data-reset-number]",
  ))
    b.onclick = () => {
      const id = b.dataset.resetNumber!;
      if (publishedTuning.numbers[id])
        tuning.numbers[id] = { ...publishedTuning.numbers[id] };
      else delete tuning.numbers[id];
      persist();
      render();
    };
  for (const b of $("content").querySelectorAll<HTMLButtonElement>(
    "[data-normalize]",
  ))
    b.onclick = () => {
      const entries = catalog.entries.filter(
          (e) => e.probabilityGroup === b.dataset.normalize,
        ),
        sum = entries.reduce((n, e) => n + valueOf(e), 0);
      if (!sum) {
        status("请至少给一个等级设置大于0的概率", true);
        return;
      }
      for (const e of entries)
        tuning.numbers[e.id] = { base: e.base, value: valueOf(e) / sum };
      persist();
      render();
    };
}
const factorOf = (input: HTMLInputElement) => Number(input.dataset.factor) || 1;
$("search").oninput = () => {
  page = 0;
  render();
};
$("scope").onchange = () => {
  page = 0;
  render();
};
$("only-changes").onchange = () => {
  page = 0;
  render();
};
function snapshot() {
  return {
    items: itemCatalog.map((e) => effective(e)),
    numbers: catalog.entries.map((e) => ({
      id: e.id,
      name: e.label,
      value: valueOf(e),
      published: e.value,
      unit: e.unit,
    })),
    containers: { ...currentContainers, ...tuning.containers },
  };
}
async function exported(includeAudio: boolean) {
  if ($("content").querySelector("input:invalid,.invalid"))
    throw Error("请先修正标红的数值，再导出配置");
  validateTuning(tuning);
  const audio = includeAudio ? await askMixer("get") : undefined;
  return {
    schema: "tricat-game-workbench",
    version: 1,
    source: {
      fingerprint: catalog.fingerprint,
      builtAt: catalog.builtAt,
      commit,
    },
    exportedAt: new Date().toISOString(),
    tuning: structuredClone(tuning),
    ...(audio ? { audio } : {}),
    currentValues: snapshot(),
  };
}
async function download(includeAudio: boolean) {
  try {
    const data = await exported(includeAudio);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tricat-${includeAudio ? "game-and-audio" : "game-tuning"}_${timestampSuffix()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status("已导出带时间戳的配置文件，发给我即可应用");
  } catch (e) {
    status((e as Error).message, true);
  }
}
$("export-all").onclick = () => void download(true);
$("export-numbers").onclick = () => void download(false);
$("import-config").onchange = async () => {
  const input = $("import-config") as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    if (raw.schema === "tricat-audio-balance") {
      parseBalance(raw);
      await askMixer("set", raw);
      status("已导入音量配置，数值草稿保持不变");
      return;
    }
    if (
      raw.schema !== "tricat-game-workbench" ||
      raw.version !== 1 ||
      raw.source?.fingerprint !== catalog.fingerprint
    )
      throw Error(
        "文件来自其他发布版本，请使用当前版本配置，避免把旧值误用到新版本",
      );
    const next = validateTuning(raw.tuning);
    if (raw.audio) parseBalance(raw.audio);
    if (raw.audio) await askMixer("set", raw.audio);
    tuning = next;
    if (raw.audio) savedAudio = raw.audio;
    persist();
    render();
    status("配置已导入，可以继续调整或再次导出");
  } catch (e) {
    status("导入失败：" + (e as Error).message, true);
  } finally {
    input.value = "";
  }
};
$("reset").onclick = async () => {
  tuning = structuredClone(publishedTuning);
  savedAudio = {
    ...structuredClone(defaultBalance),
    preview: {
      settings: {
        master: defaults.master,
        music: defaults.music,
        sfx: defaults.sfx,
      },
      track: defaultBalance.preview.track,
    },
  };
  try {
    await askMixer("set", savedAudio);
  } catch {}
  try {
    localStorage.removeItem(storageKey);
  } catch {}
  dirty = false;
  render();
  status("已恢复当前发布的数值与音量");
};
$("stop-audio").onclick = () =>
  void askMixer("stop").catch((e) => status(e.message, true));
$("counts").innerHTML =
  `<div><strong>${itemCatalog.length}</strong><span>物品与装备</span></div><div><strong>${Object.keys(currentContainers).length}</strong><span>容器类型</span></div><div><strong>${catalog.entries.length}</strong><span>当前细项规则</span></div><div><strong>${Object.keys(sampleBank).length}</strong><span>现用音效</span></div>`;
$("release").textContent =
  `数值版本 ${catalog.fingerprint} · 构建于 ${new Date(catalog.builtAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}（北京时间）`;
void fetch("../build.json?catalog=" + catalog.fingerprint, {
  cache: "no-store",
})
  .then((r) => r.json())
  .then((v) => {
    commit = v.commit;
    $("release").textContent += ` · 发布 ${commit.slice(0, 8)}`;
  })
  .catch(() => {});
if (dirty) $("dirty").textContent = "已恢复本版本草稿";
render();
Object.assign(window, {
  __gameWorkbench: {
    catalog,
    itemCatalog,
    get tuning() {
      return tuning;
    },
    exported,
    snapshot,
  },
});
