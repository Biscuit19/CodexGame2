const $ = (s) => document.querySelector(s);
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let manifest,
  group,
  serial = 0,
  ctx,
  pendingMusic;
const selected = new Map(),
  buffers = new Map(),
  voices = new Set();
const master = () => Number($("#volume").value) / 100;
const status = (s) => {
  $("#status").textContent = s;
};
function stop(message = true, keep = null) {
  serial++;
  if (pendingMusic) {
    pendingMusic.resolve(false);
    pendingMusic = null;
  }
  for (const v of voices) {
    try {
      v.node.stop();
    } catch {}
  }
  voices.clear();
  for (const a of document.querySelectorAll("audio")) {
    if (a === keep) continue;
    a.pause();
    a.currentTime = 0;
  }
  $("#sequence").disabled = false;
  if (message) status("已停止全部。");
}
async function context() {
  ctx ??= new AudioContext();
  if (ctx.state !== "running") await ctx.resume();
  return ctx;
}
async function buffer(url) {
  if (!buffers.has(url))
    buffers.set(
      url,
      (async () => {
        const r = await fetch(url);
        if (!r.ok) throw Error("音频读取失败");
        return (await context()).decodeAudioData(await r.arrayBuffer());
      })().catch((e) => {
        buffers.delete(url);
        throw e;
      }),
    );
  return buffers.get(url);
}
function schedule(b, at, factor = 1, ended = () => {}) {
  const node = ctx.createBufferSource(),
    gain = ctx.createGain();
  node.buffer = b;
  gain.gain.value = master() * factor;
  node.connect(gain).connect(ctx.destination);
  const v = { node, gain, factor };
  voices.add(v);
  node.onended = () => {
    voices.delete(v);
    node.disconnect();
    gain.disconnect();
    ended();
  };
  node.start(at);
  return node;
}
async function connectMedia(audio) {
  const c = await context();
  if (audio._linked) return;
  const g = c.createGain();
  g.gain.value = Number(audio.dataset.gain);
  c.createMediaElementSource(audio).connect(g).connect(c.destination);
  audio._linked = true;
}
async function play(candidate, token) {
  const v = candidate.versions[0];
  if (v.whole) {
    const a = document.querySelector(`audio[data-candidate="${candidate.id}"]`);
    await connectMedia(a);
    if (token !== serial) return false;
    a.currentTime = 0;
    a._managed = true;
    const promise = new Promise((resolve) => {
      pendingMusic = { audio: a, resolve, token };
    });
    try {
      await a.play();
      status(
        `完整播放 ${candidate.id} · ${candidate.name} · ${v.duration.toFixed(1)} 秒`,
      );
    } catch (e) {
      pendingMusic?.resolve(false);
      pendingMusic = null;
      throw e;
    }
    return promise;
  }
  const b = await buffer(v.url);
  if (token !== serial) return false;
  status(`单发试听 ${candidate.id} · ${candidate.name}`);
  return new Promise((resolve) =>
    schedule(b, ctx.currentTime + 0.01, 1, () => resolve(token === serial)),
  );
}
async function burst(candidate, token) {
  const b = await buffer(candidate.versions[0].url);
  if (token !== serial) return;
  const rps = Number($("#rps").value),
    seconds = Number($("#burst-seconds").value),
    n = Math.max(1, Math.floor(rps * seconds));
  // Measure the actual sum before playback, then use one fixed gain for the
  // complete burst. This prevents overlap clipping without a compressor.
  let peak = 0;
  const frames = Math.ceil(((n - 1) / rps) * b.sampleRate) + b.length;
  for (let channel = 0; channel < b.numberOfChannels; channel++) {
    const mix = new Float32Array(frames),
      a = b.getChannelData(channel);
    for (let shot = 0; shot < n; shot++) {
      const offset = Math.round((shot / rps) * b.sampleRate);
      for (let i = 0; i < a.length; i++) mix[offset + i] += a[i];
    }
    for (let i = 0; i < mix.length; i++)
      peak = Math.max(peak, Math.abs(mix[i]));
  }
  if (token !== serial) return;
  const factor = Math.min(1, 0.85 / Math.max(peak, 0.00001)),
    start = ctx.currentTime + 0.03;
  let left = n;
  status(
    `连发 ${candidate.id} · ${rps} 发/秒 · ${n} 发 · 原速，保留最后一发尾声`,
  );
  for (let i = 0; i < n; i++)
    schedule(b, start + i / rps, factor, () => {
      if (--left === 0 && token === serial) status("连发试听结束。");
    });
}
function selectionText() {
  const lines = [];
  for (const g of manifest.groups) {
    const items = g.multi
      ? g.candidates.filter((c) => selected.has(g.id + ":" + c.id))
      : [selected.get(g.id)].filter(Boolean);
    if (items.length)
      lines.push(
        `${g.title}：${items.map((c) => c.id + " " + c.name).join("；")}`,
      );
  }
  return lines.length
    ? "新枪声与完整BGM选择（尚未接入游戏）\n" + lines.join("\n")
    : "还没有选择。";
}
function updateSelection() {
  $("#selection-count").textContent = selected.size;
  $("#selection-text").textContent = selectionText();
  for (const card of document.querySelectorAll(".candidate")) {
    const chosen = group.multi
      ? selected.has(group.id + ":" + card.dataset.id)
      : selected.get(group.id)?.id === card.dataset.id;
    card.classList.toggle("chosen", chosen);
    const b = card.querySelector(".choose");
    b.setAttribute("aria-pressed", String(chosen));
    b.textContent = chosen
      ? "✓ 已选 " + card.dataset.id + " · 点击取消"
      : "选择 " + card.dataset.id;
  }
}
function initMedia() {
  for (const a of document.querySelectorAll("audio")) {
    a.volume = master();
    a.addEventListener("play", () => {
      if (a._managed) a._managed = false;
      else stop(false, a);
      void connectMedia(a).catch(() =>
        status("浏览器音频未启动，请再次播放。"),
      );
      status(
        a.dataset.candidate
          ? "完整原曲播放中 · " + a.dataset.candidate
          : "正在试听完整原声。",
      );
    });
    a.addEventListener("ended", () => {
      if (pendingMusic?.audio === a) {
        const p = pendingMusic;
        pendingMusic = null;
        p.resolve(p.token === serial);
      }
      status("完整曲目播放结束。");
    });
    a.addEventListener("pause", () => {
      if (!a.ended && pendingMusic?.audio === a) {
        pendingMusic.resolve(false);
        pendingMusic = null;
      }
    });
    a.addEventListener("error", () =>
      status("音频加载失败，请检查网络后重试。"),
    );
  }
}
function renderGroup(id) {
  stop(false);
  group = manifest.groups.find((g) => g.id === id);
  $("#category-title").textContent = group.title;
  $("#category-description").textContent = group.description;
  $("#category-count").textContent =
    `${manifest.groups.indexOf(group) + 1} / 3 类 · 10 个候选`;
  for (const b of $("#categories").children)
    b.setAttribute("aria-pressed", String(b.dataset.category === id));
  $("#gun-controls").hidden = id === "music";
  $("#rps").value = group.rps || 10;
  $("#rps-label").textContent = (group.rps || 10) + " 发/秒";
  $("#context-note").textContent =
    id === "music"
      ? "完整原曲，不截取；可多选。进度条可拖动，循环只重复整首。"
      : "单发与连发使用同一原音；不改变音高。连发可能整体固定衰减以防重叠削波。";
  $("#candidates").innerHTML = group.candidates
    .map((c) => {
      const v = c.versions[0],
        s = manifest.sources[c.source],
        p = manifest.sourcePacks[s.pack];
      const media = v.whole
        ? `<audio controls preload="none" data-candidate="${c.id}" data-gain="${v.gain}" src="${esc(v.url)}" aria-label="${c.id} 完整原曲"></audio><label class="small"><input type="checkbox" class="music-loop" data-id="${c.id}"> 循环整首</label>`
        : `<details><summary>展开完整原声</summary><audio controls preload="none" data-gain="${s.previewGain}" src="${esc(s.url)}" aria-label="${c.id} 完整原声"></audio><p class="small">原件 ${s.duration.toFixed(2)} 秒 · ${esc(s.name)}</p></details>`;
      return `<article class="candidate" data-id="${c.id}"><div class="card-top"><span class="code">${c.id}</span><div><h3>${esc(c.name)}</h3><p class="source-note">${esc(c.author)} · ${esc(c.style)}</p></div></div><p class="note">${esc(c.note)}</p><div class="audio-line"><button class="play" data-id="${c.id}">${v.whole ? "播放完整曲" : "单发试听"} ${c.id}</button>${v.whole ? "" : `<button class="burst" data-id="${c.id}">连发试听 ${c.id}</button>`}<span class="duration">${v.duration.toFixed(2)} 秒</span></div>${media}<p class="source-note"><a href="${esc(c.sourceUrl)}" target="_blank" rel="noopener">原作者 / 原发行页</a> · <a href="licenses/index.html#${esc(c.license)}">${esc(c.license)}</a></p><p class="source-note">${esc(p.evidence)}</p><button class="choose" aria-pressed="false">选择 ${c.id}</button></article>`;
    })
    .join("");
  initMedia();
  updateSelection();
  status("已切换到 " + group.title + "。");
}
$("#categories").addEventListener("click", (e) => {
  const b = e.target.closest("[data-category]");
  if (b) renderGroup(b.dataset.category);
});
$("#candidates").addEventListener("click", async (e) => {
  const choose = e.target.closest(".choose"),
    button = e.target.closest(".play,.burst");
  if (choose) {
    const c = group.candidates.find(
        (c) => c.id === choose.closest(".candidate").dataset.id,
      ),
      key = group.multi ? group.id + ":" + c.id : group.id;
    if (selected.has(key) && (group.multi || selected.get(key).id === c.id))
      selected.delete(key);
    else selected.set(key, c);
    updateSelection();
    return;
  }
  if (!button) return;
  stop(false);
  const token = serial,
    c = group.candidates.find((c) => c.id === button.dataset.id);
  try {
    if (button.classList.contains("burst")) await burst(c, token);
    else {
      const done = await play(c, token);
      if (done) status("试听结束。");
    }
  } catch (err) {
    if (token === serial) status("音频读取失败，请重试。");
  }
});
$("#candidates").addEventListener("change", (e) => {
  const cb = e.target.closest(".music-loop");
  if (cb)
    document.querySelector(`audio[data-candidate="${cb.dataset.id}"]`).loop =
      cb.checked;
});
$("#stop").addEventListener("click", () => stop());
$("#rps").addEventListener("input", () => {
  $("#rps-label").textContent = $("#rps").value + " 发/秒";
});
$("#volume").addEventListener("input", () => {
  $("#volume-label").textContent = $("#volume").value + "%";
  for (const a of document.querySelectorAll("audio")) a.volume = master();
  for (const v of voices) v.gain.gain.value = master() * v.factor;
});
$("#sequence").addEventListener("click", async () => {
  stop(false);
  const token = serial;
  $("#sequence").disabled = true;
  let list = group.candidates;
  if (group.multi) {
    const chosen = list.filter((c) => selected.has(group.id + ":" + c.id));
    if (chosen.length) list = chosen;
  }
  try {
    for (const c of list) {
      if (token !== serial || !(await play(c, token))) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (token === serial) status("本组连听完毕。");
  } catch {
    if (token === serial) status("连听加载失败，请重试。");
  } finally {
    if (token === serial) $("#sequence").disabled = false;
  }
});
$("#export").addEventListener("click", async () => {
  const text = selectionText();
  $("#copy-text").value = text;
  $("#copy-dialog").showModal();
  try {
    await navigator.clipboard.writeText(text);
    status("已复制选择，也可从弹窗复制。");
  } catch {
    status("可在弹窗中手动复制。");
  }
});
$("#close-copy").addEventListener("click", () => $("#copy-dialog").close());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop(false);
});
window.addEventListener("pagehide", () => stop(false));
try {
  const r = await fetch("manifest-v1.json");
  if (!r.ok) throw Error("清单读取失败");
  manifest = await r.json();
  if (
    manifest.groups.length !== 3 ||
    manifest.groups.some((g) => g.candidates.length !== 10)
  )
    throw Error("候选不完整");
  $("#categories").innerHTML = manifest.groups
    .map(
      (g) =>
        `<button data-category="${g.id}" aria-pressed="false">${esc(g.title)}</button>`,
    )
    .join("");
  $("#source-table").innerHTML = Object.values(manifest.sourcePacks)
    .map(
      (p) =>
        `<tr><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a><br>${esc(p.author)}</td><td>${esc(p.evidence)}</td><td><a href="licenses/index.html#${esc(p.license)}">${esc(p.license)}</a></td></tr>`,
    )
    .join("");
  renderGroup("smg");
} catch (e) {
  status("载入失败：" + e.message + "，请刷新重试。");
}
