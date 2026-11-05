const $ = (id) => document.getElementById(id);
const selected = new Map();
let master = 1;
const players = [];
const m = await fetch("manifest-v1.json").then((r) => r.json());
function status(t) {
  $("status").textContent = t;
}
function stop() {
  for (const a of players) {
    a.pause();
    a.currentTime = 0;
  }
}
function update() {
  $("selection").value = [...selected.values()]
    .map((c) => `${c.id} ${c.name}`)
    .join("\n");
}
function card(c, reference = false) {
  const div = document.createElement("article");
  div.className = "card";
  div.dataset.id = c.id;
  const title = document.createElement("h3"),
    label = document.createElement("label");
  if (!reference) {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.ariaLabel = `选择 ${c.id}`;
    cb.onchange = () => {
      if (cb.checked) selected.set(c.id, c);
      else selected.delete(c.id);
      update();
    };
    label.append(cb);
  }
  label.append(document.createTextNode(`${c.id} ${c.name}`));
  title.append(label);
  div.append(title);
  const a = document.createElement("audio");
  a.controls = true;
  a.preload = "none";
  a.src = c.audio.url;
  a.volume = master;
  a.onplay = () => {
    for (const p of players) if (p !== a) p.pause();
  };
  players.push(a);
  div.append(a);
  const meta = document.createElement("p");
  meta.className = "meta";
  meta.textContent = `${c.author} · ${c.license} · ${c.audio.duration.toFixed(2)}秒`;
  div.append(meta);
  if (c.popularity) {
    const p = document.createElement("p");
    p.className = "meta";
    p.textContent = c.popularity;
    div.append(p);
  }
  const link = document.createElement("a");
  link.href = c.sourceUrl;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = reference
    ? "原始点击代码"
    : c.design
      ? "制作参数与脚本"
      : "作者发行页";
  div.append(link);
  if (c.original) {
    const d = document.createElement("details"),
      s = document.createElement("summary");
    s.textContent = "完整原声（未匹配响度）";
    const raw = document.createElement("audio");
    raw.controls = true;
    raw.preload = "none";
    raw.src = c.original.url;
    raw.volume = master;
    raw.onplay = () => {
      for (const p of players) if (p !== raw) p.pause();
    };
    players.push(raw);
    d.append(s, raw);
    div.append(d);
  }
  return div;
}
$("reference").append(card(m.reference, true));
for (const g of m.groups) {
  const section = document.createElement("section"),
    h = document.createElement("h2"),
    grid = document.createElement("div");
  h.textContent = g.name;
  grid.className = "grid";
  for (const c of g.candidates) grid.append(card(c));
  section.append(h, grid);
  $("groups").append(section);
}
$("volume").oninput = (e) => {
  master = Number(e.target.value) / 100;
  $("volume-value").textContent = Math.round(master * 100) + "%";
  for (const a of players) a.volume = master;
};
$("stop").onclick = stop;
$("clear").onclick = () => {
  selected.clear();
  document
    .querySelectorAll("input[type=checkbox]")
    .forEach((c) => (c.checked = false));
  update();
  status("已清空选择");
};
$("copy").onclick = async () => {
  if (!selected.size) {
    status("请先勾选喜欢的声音");
    return;
  }
  try {
    await navigator.clipboard.writeText(
      "UI点击音效选择：\n" + $("selection").value,
    );
    status("已复制选择，可以发给我");
  } catch {
    $("selection").focus();
    $("selection").select();
    status("请复制下方已选内容");
  }
};
