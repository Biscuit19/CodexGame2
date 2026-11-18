const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
let manifest,
  group,
  version = 0,
  serial = 0,
  currentSource,
  ctx;
const selected = new Map(),
  buffers = new Map();
const master = () => Number($("#volume").value) / 100;
const status = (text) => {
  $("#status").textContent = text;
};
const choiceKey = () =>
  group.id +
  (group.candidates[0].versions.length > 1
    ? ":" + group.candidates[0].versions[version].id
    : "");

function stop(message = true) {
  serial++;
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {}
    currentSource = null;
  }
  for (const audio of document.querySelectorAll("audio")) {
    audio.pause();
    audio.currentTime = 0;
  }
  $("#sequence").disabled = false;
  if (message) status("已停止全部。");
}

async function getContext() {
  ctx ??= new AudioContext();
  if (ctx.state !== "running") await ctx.resume();
  return ctx;
}

async function buffer(url) {
  if (!buffers.has(url))
    buffers.set(
      url,
      (async () => {
        const response = await fetch(url);
        if (!response.ok) throw Error("音频读取失败：" + response.status);
        return (await getContext()).decodeAudioData(
          await response.arrayBuffer(),
        );
      })().catch((error) => {
        buffers.delete(url);
        throw error;
      }),
    );
  return buffers.get(url);
}

function effective(candidate) {
  const v = candidate.versions[version] ?? candidate.versions[0];
  const dry = !$("#effects").checked && v.physical;
  return { ...v, ...(dry || {}) };
}

async function play(candidate, token) {
  const target = effective(candidate),
    context = await getContext();
  const decoded = await buffer(target.url);
  if (token !== serial) return false;
  const source = context.createBufferSource(),
    gain = context.createGain();
  const wanted = group.id === "reload" ? Number($("#reload-time").value) : 0;
  source.buffer = decoded;
  source.playbackRate.value = wanted ? decoded.duration / wanted : 1;
  gain.gain.value = master();
  source.connect(gain).connect(context.destination);
  currentSource = source;
  source.previewGain = gain;
  source.start();
  const seconds = decoded.duration / source.playbackRate.value;
  status(
    `正在试听 ${candidate.id} · ${candidate.name} · ${seconds.toFixed(2)} 秒${wanted ? "（同步播放，原速音源保留）" : ""}${target.physical && !$("#effects").checked ? " · 仅进食动作" : ""}`,
  );
  return new Promise((resolve) => {
    source.onended = () => {
      if (currentSource === source) currentSource = null;
      resolve(token === serial);
    };
  });
}

function selectionText() {
  const lines = [];
  for (const g of manifest.groups) {
    const variants = g.candidates[0].versions;
    for (const v of variants.length > 1 ? variants : [{ id: "" }]) {
      const item = selected.get(g.id + (variants.length > 1 ? ":" + v.id : ""));
      if (item)
        lines.push(
          `${g.title}：${item.id} ${item.name}${item.foodVersion ? " / " + item.foodVersion : ""}${item.effects === false ? "（不加恢复点缀）" : ""}${item.reloadTime ? " / 同步 " + item.reloadTime + " 秒" : ""}`,
        );
    }
  }
  return lines.length
    ? "动作与进食音效选择（仅试听，尚未接入游戏）\n" + lines.join("\n")
    : "还没有选择。";
}

function updateSelection() {
  $("#selection-count").textContent = selected.size;
  $("#selection-text").textContent = selectionText();
  for (const card of document.querySelectorAll(".candidate")) {
    const chosen = selected.get(choiceKey())?.id === card.dataset.id;
    card.classList.toggle("chosen", chosen);
    const button = card.querySelector(".choose");
    button.setAttribute("aria-pressed", String(chosen));
    button.textContent = chosen
      ? "✓ 已选 " + card.dataset.id + " · 点击取消"
      : "选择 " + card.dataset.id;
  }
}

function timeline(v) {
  return v.parts
    .filter((p) => $("#effects").checked || !p.label.includes("恢复"))
    .map(
      (p) =>
        `<span class="${p.label.includes("恢复") ? "effect" : ""}">${p.at.toFixed(2)}s · ${esc(p.label)}</span>`,
    )
    .join("");
}

function originals(candidate) {
  const ids = [
    ...new Set(candidate.versions.flatMap((v) => v.parts.map((p) => p.source))),
  ];
  return ids
    .map((id) => {
      const s = manifest.sources[id],
        p = manifest.sourcePacks[s.pack];
      return `<div class="original"><p class="name">${esc(s.name)}</p><p>${esc(s.author)} · <a href="${esc(s.source)}" target="_blank" rel="noopener">原始发行页</a> · <a href="licenses/index.html#${s.license}" target="_blank" rel="noopener">${esc(s.license)}</a></p><p class="source-note">${esc(p.evidence)} ${esc(s.note || "")}</p><audio controls preload="none" data-source-id="${esc(id)}" aria-label="${esc(candidate.id + " 原声 " + s.name)}" src="${esc(s.url)}"></audio><p class="small">完整原录音 ${s.duration.toFixed(2)} 秒；播放器音量随顶部音量调节，音量匹配采用固定增益。</p></div>`;
    })
    .join("");
}

function renderCards() {
  $("#candidates").innerHTML = group.candidates
    .map((c) => {
      const v = effective(c),
        authors = [
          ...new Set(v.parts.map((p) => manifest.sources[p.source].author)),
        ];
      return `<article class="candidate" data-id="${esc(c.id)}"><div class="card-top"><span class="code">${esc(c.id)}</span><div><h3>${esc(c.name)}</h3><p class="source-note">${esc(authors.join(" / "))}</p></div></div><p class="note">${esc(c.note)}</p>${c.reason ? `<p class="reason">${esc(c.reason)}</p>` : ""}<div class="audio-line"><button class="play" data-id="${esc(c.id)}">试听 ${esc(c.id)}</button><span class="duration">${esc(v.name)} · ${v.duration.toFixed(2)}s</span></div><div class="timeline">${timeline(v)}</div><p class="source-note">原声/组合许可：${esc(c.license)} · <a href="licenses/index.html" target="_blank" rel="noopener">署名与条款</a></p><button class="choose" aria-pressed="false">选择 ${esc(c.id)}</button><details><summary>展开原声、作者与热度依据</summary>${originals(c)}</details></article>`;
    })
    .join("");
  for (const audio of document.querySelectorAll("audio")) {
    const s = manifest.sources[audio.dataset.sourceId];
    // Keep native volume at the user's requested 100% initially. Source matching
    // is performed through Web Audio fixed gain, not a tiny volume slider.
    audio.volume = master();
    audio.addEventListener("play", () => {
      serial++;
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {}
        currentSource = null;
      }
      $("#sequence").disabled = false;
      for (const other of document.querySelectorAll("audio"))
        if (other !== audio) other.pause();
      if (!audio.dataset.connected) {
        getContext()
          .then((context) => {
            if (audio.dataset.connected) return;
            const gain = context.createGain();
            gain.gain.value = s.previewGain;
            context
              .createMediaElementSource(audio)
              .connect(gain)
              .connect(context.destination);
            audio.dataset.connected = "true";
          })
          .catch(() => status("浏览器未启动音频，请再点击播放。"));
      }
      status("正在试听完整原声 · " + s.name);
    });
    audio.addEventListener("error", () =>
      status("原声加载失败，请检查网络后重试。"),
    );
  }
  updateSelection();
}

function renderGroup(id) {
  stop(false);
  group = manifest.groups.find((g) => g.id === id);
  version = 0;
  for (const button of $("#categories").children)
    button.setAttribute("aria-pressed", String(button.dataset.category === id));
  $("#category-count").textContent =
    `${manifest.groups.indexOf(group) + 1} / 12 类 · 5 个候选`;
  $("#category-title").textContent = group.title;
  $("#category-description").textContent = group.description;
  $("#food-items").innerHTML = group.items
    .map(
      (item) =>
        `<div class="food-tag">${esc(item.name)} · ${item.tier} 级 · ${item.seconds} 秒<small>${esc(item.effect)}</small></div>`,
    )
    .join("");
  const versions = group.candidates[0].versions;
  $("#version").innerHTML = versions
    .map((v, i) => `<option value="${i}">${esc(v.name)}</option>`)
    .join("");
  $("#version-wrap").hidden = versions.length < 2;
  $("#effects-wrap").hidden = !versions[0].physical;
  $("#reload-wrap").hidden = id !== "reload";
  $("#context-note").textContent =
    id === "reload"
      ? "同步试听使用播放速度匹配动作，和游戏的换弹同步方式一致；这不会覆盖现用换弹。"
      : versions[0].physical
        ? "主体是食物动作。恢复点缀可关闭；声音仅在食用完成附近提示一次，不在持续回血期间反复播放。"
        : "音量默认 100%；每次只播放一条，切换类别或按停止即可立即停止。";
  renderCards();
  status("已切换到 " + group.title + "。");
}

$("#candidates").addEventListener("click", async (event) => {
  const playButton = event.target.closest(".play"),
    choice = event.target.closest(".choose");
  if (playButton) {
    stop(false);
    const token = serial;
    try {
      const done = await play(
        group.candidates.find((c) => c.id === playButton.dataset.id),
        token,
      );
      if (done) status("试听结束。");
    } catch {
      if (token === serial) status("音频加载失败，请检查网络后重试。");
    }
  } else if (choice) {
    const candidate = group.candidates.find(
      (c) => c.id === choice.closest(".candidate").dataset.id,
    );
    if (selected.get(choiceKey())?.id === candidate.id)
      selected.delete(choiceKey());
    else
      selected.set(choiceKey(), {
        id: candidate.id,
        name: candidate.name,
        foodVersion:
          group.candidates[0].versions.length > 1
            ? effective(candidate).name
            : "",
        effects: !effective(candidate).physical
          ? undefined
          : $("#effects").checked,
        reloadTime:
          group.id === "reload" ? Number($("#reload-time").value) : undefined,
      });
    updateSelection();
  }
});
$("#categories").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) renderGroup(button.dataset.category);
});
$("#version").addEventListener("change", () => {
  stop(false);
  version = Number($("#version").value);
  renderCards();
});
$("#effects").addEventListener("change", () => {
  stop(false);
  const item = selected.get(choiceKey());
  if (item) item.effects = $("#effects").checked;
  renderCards();
});
$("#reload-time").addEventListener("change", () => {
  stop(false);
  const item = selected.get(choiceKey());
  if (item) item.reloadTime = Number($("#reload-time").value);
  updateSelection();
  status("换弹播放时长已调整；点击试听。");
});
$("#volume").addEventListener("input", () => {
  $("#volume-label").textContent = $("#volume").value + "%";
  for (const audio of document.querySelectorAll("audio"))
    audio.volume = master();
  if (currentSource?.previewGain)
    currentSource.previewGain.gain.value = master();
});
$("#stop").addEventListener("click", () => stop());
$("#sequence").addEventListener("click", async () => {
  stop(false);
  const token = serial;
  $("#sequence").disabled = true;
  try {
    for (const c of group.candidates) {
      if (token !== serial || !(await play(c, token))) return;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    if (token === serial) status("本类 5 个候选已播放完毕。");
  } catch {
    if (token === serial) status("连听中断，音频加载失败；可以单独重试。");
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
    status("已复制选择，也可从弹窗手动复制。");
  } catch {
    status("可在弹窗中手动复制选择。");
  }
});
$("#close-copy").addEventListener("click", () => $("#copy-dialog").close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") stop();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop(false);
});
window.addEventListener("pagehide", () => stop(false));

try {
  const response = await fetch("manifest-v1.json");
  if (!response.ok) throw Error("候选清单读取失败");
  manifest = await response.json();
  if (
    manifest.groups.length !== 12 ||
    manifest.groups.some((g) => g.candidates.length !== 5)
  )
    throw Error("候选清单不完整");
  $("#categories").innerHTML = manifest.groups
    .map(
      (g) =>
        `<button data-category="${esc(g.id)}" aria-pressed="false">${esc(g.title)}</button>`,
    )
    .join("");
  $("#source-table").innerHTML = Object.values(manifest.sourcePacks)
    .map(
      (p) =>
        `<tr><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a><br>${esc(p.author)}</td><td>${esc(p.evidence)}</td><td><a href="licenses/index.html#${esc(p.license)}" target="_blank" rel="noopener">${esc(p.license)}</a></td></tr>`,
    )
    .join("");
  $("#research-links").innerHTML = manifest.research
    .map(
      (r) =>
        `<p><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>：${esc(r.note)}</p>`,
    )
    .join("");
  renderGroup("reload");
} catch (error) {
  status("载入失败：" + error.message + "。请刷新后重试。");
}
