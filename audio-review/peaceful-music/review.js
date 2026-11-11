const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const key = "tricat-peaceful-music-choice-v1";
let tracks = [],
  selected = { base: [], game: [] },
  ctx;
const gainNodes = new Map();
try {
  const old = JSON.parse(localStorage.getItem(key) || "null");
  if (old && Array.isArray(old.base) && Array.isArray(old.game)) selected = old;
} catch {}
const say = (s) => ($("#status").textContent = s);
function stop(keep) {
  for (const a of document.querySelectorAll("audio"))
    if (a !== keep) {
      a.pause();
      a.currentTime = 0;
    }
}
async function prepare(a) {
  ctx ??= new AudioContext();
  await ctx.resume();
  if (!gainNodes.has(a)) {
    const gain = ctx.createGain();
    gain.gain.value = Number(a.dataset.gain) || 1;
    ctx.createMediaElementSource(a).connect(gain).connect(ctx.destination);
    gainNodes.set(a, gain);
  }
  a.volume = Number($("#volume").value) / 100;
}
function text() {
  return [
    "静谧音乐选择（未采用项仍为候选）",
    ...["base", "game"].map(
      (area) =>
        (area === "base" ? "基地音乐" : "游戏音乐") +
        "：" +
        tracks
          .filter((t) => selected[area].includes(t.id))
          .map((t) => `${t.id} ${t.name} · ${t.title} (${t.author})`)
          .join("；"),
    ),
  ].join("\n");
}
function selection() {
  const ids = new Set(tracks.map((t) => t.id));
  for (const area of ["base", "game"])
    selected[area] = selected[area].filter((id) => ids.has(id));
  $("#selection").textContent = text();
  for (const b of document.querySelectorAll("[data-area]")) {
    const on = selected[b.dataset.area].includes(b.dataset.id);
    b.setAttribute("aria-pressed", String(on));
    b.textContent =
      (on ? "✓ " : "") +
      (b.dataset.area === "base" ? "基地用 " : "游戏用 ") +
      b.dataset.id;
  }
  $("#count").textContent =
    `20首 · 基地已选${selected.base.length}首 / 游戏已选${selected.game.length}首`;
  try {
    localStorage.setItem(key, JSON.stringify(selected));
  } catch {}
}
function bindMedia() {
  for (const a of document.querySelectorAll("audio")) {
    a.volume = 1;
    a.addEventListener("play", () => {
      stop(a);
      void prepare(a).catch(() => say("音频尚未启动，请再点一次播放。"));
      say("正在试听 " + (a.dataset.id || "暖窝基地参考曲"));
    });
    a.addEventListener("error", () => say("音频加载失败，请检查网络并重试。"));
  }
}
$("#stop").onclick = () => {
  stop();
  say("已停止全部试听。");
};
$("#volume").oninput = () => {
  const n = Number($("#volume").value);
  $("#volume-value").textContent = n + "%";
  for (const a of document.querySelectorAll("audio")) a.volume = n / 100;
};
$("#tracks").onclick = async (e) => {
  const choose = e.target.closest("[data-area]");
  if (choose) {
    const list = selected[choose.dataset.area],
      id = choose.dataset.id;
    selected[choose.dataset.area] = list.includes(id)
      ? list.filter((x) => x !== id)
      : [...list, id];
    selection();
    return;
  }
  const play = e.target.closest("[data-play]");
  if (play) {
    const a = document.querySelector(`audio[data-id="${play.dataset.play}"]`);
    try {
      stop(a);
      await prepare(a);
      await a.play();
    } catch {
      say("播放失败，请使用音频条再次播放。");
    }
  }
};
$("#tracks").onchange = (e) => {
  const loop = e.target.closest("[data-loop]");
  if (loop)
    document.querySelector(`audio[data-id="${loop.dataset.loop}"]`).loop =
      loop.checked;
};
$("#search").oninput = () => {
  const q = $("#search").value.toLowerCase().trim();
  for (const card of document.querySelectorAll(".card"))
    card.hidden = !card.textContent.toLowerCase().includes(q);
};
$("#copy").onclick = async () => {
  const value = text();
  $("#copy-text").value = value;
  $("#copy-dialog").showModal();
  try {
    await navigator.clipboard.writeText(value);
    say("已复制选择，也可以在弹窗中手动复制。");
  } catch {
    say("请从弹窗中手动复制。");
  }
};
$("#close-copy").onclick = () => $("#copy-dialog").close();
$("#export").onclick = () => {
  const now = new Date(),
    suffix = new Date(now.getTime() + 8 * 3600000)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(".", "_")
      .replace("Z", "+0800");
  const profile = {
    schema: "tricat-peaceful-music-selection",
    version: 1,
    exportedAt: now.toISOString(),
    ...selected,
    tracks: tracks
      .filter(
        (t) => selected.base.includes(t.id) || selected.game.includes(t.id),
      )
      .map(({ id, title, author, sourceUrl, sha256 }) => ({
        id,
        title,
        author,
        sourceUrl,
        sha256,
      })),
  };
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(profile, null, 2)], {
        type: "application/json",
      }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `tricat-music-selection_${suffix}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say("已导出选择文件，文件名含北京时间戳。");
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});
window.addEventListener("pagehide", () => stop());
try {
  const r = await fetch("manifest.json");
  if (!r.ok) throw Error("清单不可用");
  const m = await r.json();
  tracks = m.tracks;
  if (tracks.length !== 20) throw Error("候选数量不完整");
  $("#tracks").innerHTML = tracks
    .map(
      (t) =>
        `<article class="card" data-track="${t.id}"><span class="code">${t.id} · 完整原曲</span><h2>${esc(t.name)}</h2><div class="original-title">${esc(t.title)} · ${esc(t.author)}${t.album ? ` · 专辑 ${esc(t.album)}` : ""}</div><p class="style">${esc(t.style)}</p><p>${esc(t.note)}</p><div class="meta"><button data-play="${t.id}">播放 ${t.id}</button><span>${Math.floor(t.duration / 60)}:${String(Math.round(t.duration % 60)).padStart(2, "0")}</span><label class="loop"><input type="checkbox" data-loop="${t.id}">循环整首</label></div><audio controls preload="none" src="${esc(t.url)}" data-id="${t.id}" data-gain="${t.gain}" aria-label="${t.id} 完整原曲"></audio><div class="source"><a target="_blank" rel="noopener" href="${esc(t.sourceUrl)}">原作者／发行页</a> · <a target="_blank" rel="noopener" href="${esc(t.licenseUrl)}">${esc(t.license)}</a></div><p class="evidence">${esc(t.evidence)}</p><div class="choices"><button data-area="base" data-id="${t.id}" aria-pressed="false">基地用 ${t.id}</button><button data-area="game" data-id="${t.id}" aria-pressed="false">游戏用 ${t.id}</button></div></article>`,
    )
    .join("");
  bindMedia();
  selection();
  say("20首完整音乐已就绪，试听音量100%。");
} catch (e) {
  say("加载失败：" + e.message);
}
