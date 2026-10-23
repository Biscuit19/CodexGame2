import "./audio-mixer.css";
import { Sound } from "./audio";
import { sampleBank, type SampleKey, type SoundOptions } from "./audio-samples";
import {
  defaultBalance,
  parseBalance,
  type AudioBalance,
} from "./audio-balance";
import { musicTracks, type MusicTrack } from "./music";
import { defaults, type Settings } from "./store";
const $ = (id: string) => document.getElementById(id)!;
const storageKey = "tricat-audio-mixer-v1";
let balance: AudioBalance = structuredClone(defaultBalance);
let settings: Settings = { ...defaults, musicMode: "loop" };
let picked: MusicTrack = "BG5";
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
  if (saved) {
    balance = parseBalance(saved);
    if (saved.preview) {
      for (const k of ["master", "music", "sfx"] as const)
        if (
          Number.isFinite(saved.preview.settings?.[k]) &&
          saved.preview.settings[k] >= 0 &&
          saved.preview.settings[k] <= 1
        )
          settings[k] = saved.preview.settings[k];
      if (saved.preview.track in musicTracks) picked = saved.preview.track;
    }
  }
} catch {}
const sound = new Sound(settings, balance);
sound.mode = "raid";
const status = (text: string) => {
  $("status").textContent = text;
};
const profile = () => ({
  ...balance,
  samples: Object.fromEntries(
    Object.keys(sampleBank).map((key) => [key, balance.samples[key] ?? 1]),
  ),
  music: Object.fromEntries(
    Object.keys(musicTracks).map((key) => [key, balance.music[key] ?? 1]),
  ),
  cues: Object.fromEntries(
    [
      "click",
      "hit",
      "alert",
      "success",
      "death",
      "heal",
      "search",
      ...[
        "box",
        "toolbox",
        "cooler",
        "trashcan",
        "basket",
        "litter",
        "cabinet",
        "medical",
        "weapon",
        "bed",
        "safe",
        "corpse",
      ].map((k) => "search:" + k),
    ].map((key) => [key, balance.cues[key] ?? 1]),
  ),
  preview: {
    settings: {
      master: settings.master,
      music: settings.music,
      sfx: settings.sfx,
    },
    track: picked,
  },
  exportedAt: new Date().toISOString(),
});
function save() {
  sound.apply();
  try {
    localStorage.setItem(storageKey, JSON.stringify(profile()));
  } catch {
    status("浏览器未允许本地保存，仍可导出配置");
  }
}
function start() {
  settings.musicTrack = picked;
  sound.start();
  if (!musicOn) sound.pauseMusic();
}
let musicOn = false;
function slider(
  parent: HTMLElement,
  label: string,
  current: number,
  update: (n: number) => void,
  max = 4,
) {
  const row = document.createElement("div");
  row.className = "volume-row";
  const name = document.createElement("label"),
    input = document.createElement("input"),
    value = document.createElement("input");
  value.type = "number";
  value.min = "0";
  value.max = String(max * 100);
  value.step = "1";
  value.ariaLabel = label + "百分比";
  name.textContent = label;
  input.type = "range";
  input.min = "0";
  input.max = String(max);
  input.step = "0.01";
  input.value = String(current);
  input.ariaLabel = label;
  const show = () =>
    (value.value = String(Math.round(Number(input.value) * 100)));
  show();
  input.oninput = () => {
    show();
    update(Number(input.value));
    save();
    if (!musicOn) sound.pauseMusic();
  };
  value.onchange = () => {
    if (!Number.isFinite(value.valueAsNumber)) return;
    input.value = String(Math.max(0, Math.min(max, value.valueAsNumber / 100)));
    input.dispatchEvent(new Event("input"));
  };
  name.append(input);
  row.append(name, value, document.createTextNode("%"));
  parent.append(row);
  return row;
}
const labels: Record<SampleKey, string> = {
  buy: "购买 · BU3 几枚硬币付款",
  sell: "售卖 · SE1 售出零钱收入",
  discard: "丢弃 · DP1 皮革物品落下",
  "discover-1": "发现 · 1级",
  "discover-2": "发现 · 2级",
  "discover-3": "发现 · 3级 D12-1",
  "discover-4": "发现 · 4级 D3-2",
  "discover-5": "发现 · 5级 D5-4",
  "unlock-4": "首次解锁 · 4级 D4-1",
  "unlock-5": "首次解锁 · 5级 D5-2",
  hurt: "玩家受击 · PH10",
  "enemy-alert-1": "敌人警戒 · EA5",
  "enemy-alert-2": "敌人警戒 · EA6",
  "enemy-alert-3": "敌人警戒 · EA7",
  "enemy-alert-4": "敌人警戒 · EA10",
  "shot-smg": "冲锋枪 · 射击",
  "shot-rifle": "步枪 · 射击",
  "shot-sniper": "狙击枪 · 射击",
  "shot-shotgun": "霰弹枪 · 射击",
  "reload-smg": "冲锋枪 · 换弹",
  "reload-rifle": "步枪 · 换弹",
  "reload-sniper": "狙击枪 · 换弹",
  "reload-shotgun": "霰弹枪 · 换弹",
  "equip-weapon": "装备武器 / 切枪",
  "equip-gear": "装备护具",
  roll: "翻滚",
  "melee-first": "挥刀 · 第一刀",
  "melee-second": "挥刀 · 第二刀",
  "switch-melee": "切刀",
  "open-box": "打开 · 纸箱",
  "open-toolbox": "打开 · 生锈工具盒",
  "open-cooler": "打开 · 乡间保温箱",
  "open-trashcan": "打开 · 绿色垃圾桶",
  "open-basket": "打开 · 鸟窝",
  "open-litter": "打开 · 猫砂桶",
  "open-cabinet": "打开 · 工具柜",
  "open-medical": "打开 · 医疗箱",
  "open-weapon": "打开 · 武器箱",
  "open-bed": "打开 · 豪华猫窝",
  "open-safe": "打开 · 保险箱",
  "open-corpse": "打开 · 普通 / Boss战利品盒",
  pack: "放入背包 · D12-3",
  "food-fish": "进食 · 小鱼干",
  "food-paste": "进食 · 猫条",
  "food-ice": "进食 · 冰淇淋",
  "food-water": "喝水",
  "food-milk": "喝核爪饮品",
  "food-can": "进食 · 金枪鱼罐头",
  "food-fries": "进食 · 薯四 / 快乐餐盒",
  "food-tier4": "进食 · 4级食物",
};
function request(key: SampleKey): [string, number, SoundOptions] {
  if (key.startsWith("shot-"))
    return ["shot", 1, { weaponClass: key.slice(5) as any }];
  if (key.startsWith("reload-"))
    return [
      "reload",
      1,
      {
        weaponClass: key.slice(7) as any,
        seconds: Number(($("seconds") as HTMLInputElement).value) || 3,
      },
    ];
  if (key.startsWith("discover-")) return ["loot", Number(key.slice(9)), {}];
  if (key.startsWith("unlock-")) return ["unlock", Number(key.slice(7)), {}];
  if (key.startsWith("open-"))
    return ["open", 1, { containerType: key.slice(5) }];
  if (key.startsWith("enemy-alert-"))
    return ["enemy-alert", 1, { variant: Number(key.slice(-1)) - 1 }];
  if (key === "melee-first" || key === "melee-second")
    return ["melee", 1, { swing: key === "melee-first" ? 1 : 2 }];
  if (key.startsWith("food-"))
    return [
      "food",
      1,
      {
        foodId: (
          {
            "food-fish": "f1",
            "food-paste": "f2",
            "food-ice": "c3_1",
            "food-water": "c1_9",
            "food-milk": "c1_1",
            "food-can": "f3",
            "food-fries": "c1_10",
            "food-tier4": "f4",
          } as Record<string, string>
        )[key],
        seconds: Number(($("seconds") as HTMLInputElement).value) || 3,
      },
    ];
  return [key, 1, {}];
}
function play(key: SampleKey) {
  start();
  const [name, tier, options] = request(key);
  sound.play(name, tier, options);
  status("试听：" + labels[key]);
}
function button(row: HTMLElement, label: string, fn: () => void) {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = fn;
  row.append(b);
}
function render() {
  for (const id of ["buses", "settings", "tracks", "effects"])
    $(id).replaceChildren();
  for (const [key, label] of [
    ["master", "总音量"],
    ["music", "BGM总音量"],
    ["effects", "音效总音量"],
  ] as const)
    slider(
      $("buses"),
      label,
      balance.buses[key] / defaultBalance.buses[key],
      (n) => (balance.buses[key] = n * defaultBalance.buses[key]),
      key === "master" ? 3 : 4,
    );
  slider(
    $("buses"),
    "敌人射击（默认＝玩家50%）",
    balance.enemyShots,
    (n) => (balance.enemyShots = n),
  );
  slider(
    $("buses"),
    "敌人换弹（默认＝玩家75%）",
    balance.enemyReloads,
    (n) => (balance.enemyReloads = n),
  );
  for (const [k, label] of [
    ["master", "游戏设置 · 总音量"],
    ["music", "游戏设置 · 音乐"],
    ["sfx", "游戏设置 · 音效"],
  ] as const)
    slider($("settings"), label, settings[k], (n) => (settings[k] = n), 1);
  for (const [key, track] of Object.entries(musicTracks)) {
    const row = slider(
      $("tracks"),
      track.name,
      balance.music[key] ?? 1,
      (n) => (balance.music[key] = n),
    );
    button(row, "播放此曲", () => {
      picked = key as MusicTrack;
      ($("bgm") as HTMLSelectElement).value = picked;
      musicOn = true;
      start();
      save();
    });
  }
  for (const key of Object.keys(sampleBank) as SampleKey[]) {
    const row = slider(
      $("effects"),
      labels[key],
      balance.samples[key] ?? 1,
      (n) => (balance.samples[key] = n),
    );
    row.dataset.label = labels[key];
    row.dataset.key = key;
    button(row, "试听", () => play(key));
    if (key.startsWith("shot-")) {
      button(row, "连发1秒", () => {
        start();
        let count = 0;
        const tick = () => {
          if (count++ >= 8) return;
          const [n, t, o] = request(key);
          sound.play(n, t, o);
          timers.push(window.setTimeout(tick, 125));
        };
        tick();
      });
      button(row, "敌人射击", () => {
        start();
        const [n, t, o] = request(key);
        sound.play(n, t, { ...o, enemy: true });
      });
    }
    if (key.startsWith("reload-"))
      button(row, "敌人换弹", () => {
        start();
        const [n, t, o] = request(key);
        sound.play(n, t, { ...o, enemy: true });
      });
  }
  for (const [key, label] of [
    ["click", "UI点击 · 原始声音"],
    ["hit", "命中反馈"],
    ["alert", "警报提示"],
    ["success", "撤离成功"],
    ["death", "死亡提示"],
    ["heal", "恢复提示"],
    ["search", "搜索过程 · 全部容器"],
  ]) {
    const row = slider(
      $("effects"),
      label,
      balance.cues[key] ?? 1,
      (n) => (balance.cues[key] = n),
    );
    row.dataset.label = label;
    button(row, "试听", () => {
      start();
      sound.play(key);
    });
    if (key === "search")
      button(row, "循环3秒", () => {
        start();
        for (let i = 0; i < 15; i++)
          timers.push(window.setTimeout(() => sound.play("search"), i * 200));
      });
  }
  for (const kind of [
    "box",
    "toolbox",
    "cooler",
    "trashcan",
    "basket",
    "litter",
    "cabinet",
    "medical",
    "weapon",
    "bed",
    "safe",
    "corpse",
  ]) {
    const key = "search:" + kind,
      label = (labels[("open-" + kind) as SampleKey] || kind).replace(
        "打开",
        "搜索过程",
      );
    const row = slider(
      $("effects"),
      label,
      balance.cues[key] ?? 1,
      (n) => (balance.cues[key] = n),
    );
    row.dataset.label = label;
    button(row, "循环3秒", () => {
      start();
      for (let i = 0; i < 15; i++)
        timers.push(
          window.setTimeout(
            () => sound.play("search", 1, { containerType: kind }),
            i * 200,
          ),
        );
    });
  }
}
let timers: number[] = [];
for (const [key, t] of Object.entries(musicTracks)) {
  const o = document.createElement("option");
  o.value = key;
  o.textContent = t.name;
  $("bgm").append(o);
}
($("bgm") as HTMLSelectElement).value = picked;
$("bgm").onchange = () => {
  picked = ($("bgm") as HTMLSelectElement).value as MusicTrack;
  if (musicOn) start();
  save();
};
$("music-play").onclick = () => {
  musicOn = true;
  start();
  status("正在播放背景音乐");
};
$("music-stop").onclick = () => {
  musicOn = false;
  sound.pauseMusic();
  status("背景音乐已暂停");
};
$("stop").onclick = () => {
  for (const t of timers) clearTimeout(t);
  timers = [];
  sound.stopSamples();
  status("已停止音效试听");
};
$("export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(profile(), null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "tricat-audio-balance.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status("配置已导出，将JSON文件发给我即可");
};
$("import").onchange = async () => {
  const file = ($("import") as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    balance = parseBalance(raw);
    sound.balance = balance;
    if (raw.preview?.settings)
      for (const k of ["master", "music", "sfx"] as const)
        if (
          Number.isFinite(raw.preview.settings[k]) &&
          raw.preview.settings[k] >= 0 &&
          raw.preview.settings[k] <= 1
        )
          settings[k] = raw.preview.settings[k];
    if (raw.preview?.track in musicTracks) picked = raw.preview.track;
    settings.musicTrack = picked;
    ($("bgm") as HTMLSelectElement).value = picked;
    render();
    save();
    if (!musicOn) sound.pauseMusic();
    status("已导入配置");
  } catch (e) {
    status("导入失败：" + (e as Error).message);
  }
};
$("reset").onclick = () => {
  balance = structuredClone(defaultBalance);
  sound.balance = balance;
  Object.assign(settings, defaults);
  picked = "BG5";
  settings.musicTrack = picked;
  ($("bgm") as HTMLSelectElement).value = picked;
  render();
  save();
  if (!musicOn) sound.pauseMusic();
  status("已恢复本轮游戏默认音量");
};
$("filter").oninput = () => {
  const q = ($("filter") as HTMLInputElement).value;
  $("effects")
    .querySelectorAll<HTMLElement>(".volume-row")
    .forEach((r) => (r.hidden = !(r.dataset.label || "").includes(q)));
};
render();
Object.assign(window, { __audioMixer: { sound, profile, request, labels } });
