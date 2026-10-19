import type { Raid } from "./raid";
import { drawVillageGround } from "./village-ground";
import {
  villageBuildings,
  villageTrees,
  villageRocks,
  villageDecorations,
  villageFenceRects,
  villageBridges,
  villagePoint,
  VILLAGE_WIDTH,
  VILLAGE_HEIGHT,
} from "./village";
const W = 1560,
  H = 1040,
  S = W / VILLAGE_WIDTH;
let atlas: HTMLCanvasElement | undefined;
function rounded(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1.7;
    c.stroke();
  }
}
function poly(
  c: CanvasRenderingContext2D,
  p: number[][],
  fill: string,
  stroke = "#625b43",
) {
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = 1.6;
  c.stroke();
}
function label(
  c: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 40,
) {
  c.font = `bold ${size}px "Noto Sans SC",sans-serif`;
  const width = c.measureText(value).width + 24;
  x = Math.max(width / 2 + 12, Math.min(W - width / 2 - 12, x));
  rounded(
    c,
    x - width / 2,
    y - size * 0.7,
    width,
    size * 1.3,
    9,
    "#eee3c4",
    "#7f7959",
  );
  c.fillStyle = "#364a36";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(value, x, y);
}
function createAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.save();
  c.scale(S, S);
  drawVillageGround(c);
  c.restore();
  // Pictorial cartography: rounded trees, timber fence posts, roof tiles and framed labels.
  for (const f of villageFenceRects) {
    const horizontal = f.w > f.h,
      length = (horizontal ? f.w : f.h) * S;
    c.save();
    c.translate(f.x * S, f.y * S);
    if (!horizontal) c.rotate(Math.PI / 2);
    c.strokeStyle = "#725e40";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-length / 2, 0);
    c.lineTo(length / 2, 0);
    c.stroke();
    for (let x = -length / 2; x <= length / 2; x += 16) {
      rounded(c, x - 2.5, -5, 5, 10, 1, "#9c8057", "#60563e");
    }
    c.restore();
  }
  for (const [x, y] of villageTrees) {
    const px = x * S,
      py = y * S;
    c.save();
    c.translate(px, py);
    c.fillStyle = "#53694444";
    c.beginPath();
    c.ellipse(2, 6, 14, 6, 0, 0, Math.PI * 2);
    c.fill();
    rounded(c, -2.5, -6, 5, 16, 2, "#806746");
    c.beginPath();
    c.moveTo(0, -29);
    c.bezierCurveTo(-10, -27, -8, -21, -13, -17);
    c.bezierCurveTo(-24, -9, -18, 0, -13, 1);
    c.bezierCurveTo(-16, 12, 2, 12, 6, 7);
    c.bezierCurveTo(21, 12, 23, -5, 15, -10);
    c.bezierCurveTo(16, -21, 6, -23, 0, -29);
    c.fillStyle = "#4e7950";
    c.fill();
    c.strokeStyle = "#3d5c3e";
    c.lineWidth = 1.8;
    c.stroke();
    c.beginPath();
    c.moveTo(-6, -17);
    c.quadraticCurveTo(-12, -5, -7, 1);
    c.strokeStyle = "#72965e";
    c.lineWidth = 3;
    c.stroke();
    c.restore();
  }
  for (const [x, y] of villageRocks) {
    c.save();
    c.translate(x * S, y * S);
    poly(
      c,
      [
        [-11, 3],
        [-13, -5],
        [-4, -12],
        [8, -10],
        [14, 1],
        [6, 8],
      ],
      "#949b8d",
      "#596858",
    );
    c.restore();
  }
  for (const b of villageBridges) {
    const width = b.w * S,
      height = b.h * S;
    c.save();
    c.translate(b.x * S, b.y * S);
    rounded(c, -width / 2, -height / 2, width, height, 3, "#b7996c", "#766244");
    c.strokeStyle = "#8d7553";
    c.lineWidth = 1.2;
    if (b.rotation) {
      for (let x = -width / 2 + 8; x < width / 2; x += 8) {
        c.beginPath();
        c.moveTo(x, -height / 2);
        c.lineTo(x, height / 2);
        c.stroke();
      }
    } else {
      for (let y = -height / 2 + 8; y < height / 2; y += 8) {
        c.beginPath();
        c.moveTo(-width / 2, y);
        c.lineTo(width / 2, y);
        c.stroke();
      }
    }
    c.restore();
  }
  const colors = [
    "#d8733f",
    "#d8733f",
    "#d8733f",
    "#d8733f",
    "#d8733f",
    "#d8733f",
  ];
  for (const [index, b] of villageBuildings.entries()) {
    const w = Math.max(72, Math.min(137, b.w * S)),
      h = Math.max(58, Math.min(102, b.h * S));
    c.save();
    c.translate(b.x * S, b.y * S);
    c.rotate(b.rotation * 0.45);
    rounded(c, -w / 2 + 8, -h / 2 + 12, w, h, 7, "#42553a40");
    rounded(
      c,
      -w * 0.43,
      -h * 0.12,
      w * 0.86,
      h * 0.62,
      4,
      "#b4b3c3",
      "#786b50",
    );
    for (const x of [-w * 0.31, w * 0.31]) {
      rounded(c, x - 9, h * 0.13, 18, 19, 2, "#89a0a0", "#736d56");
      c.fillStyle = "#e3d9bc";
      c.fillRect(x - 1, h * 0.13, 2, 19);
    }
    rounded(c, -9, h * 0.16, 18, h * 0.37, 3, "#8d7758", "#665b43");
    poly(
      c,
      [
        [-w * 0.53, -h * 0.12],
        [0, -h * 0.65],
        [w * 0.53, -h * 0.12],
        [w * 0.43, h * 0.04],
        [0, -h * 0.43],
        [-w * 0.43, h * 0.04],
      ],
      colors[index],
    );
    c.strokeStyle = "#fff0cf55";
    c.lineWidth = 1.2;
    for (let n = 1; n < 5; n++) {
      const t = n / 5;
      c.beginPath();
      c.moveTo(-w * 0.5 * (1 - t), -h * 0.12 - h * 0.48 * t);
      c.lineTo(0, -h * 0.43 - h * 0.2 * t);
      c.lineTo(w * 0.5 * (1 - t), -h * 0.12 - h * 0.48 * t);
      c.stroke();
    }
    rounded(c, w * 0.21, -h * 0.58, 12, 20, 2, "#b0ad9a", "#706e59");
    if (b.id === "clinic") {
      c.fillStyle = "#b65043";
      c.fillRect(-14, -h * 0.13, 28, 8);
      c.fillRect(-4, -h * 0.13 - 10, 8, 28);
    }
    if (b.id === "shop") {
      rounded(c, -w * 0.44, h * 0.1, w * 0.88, 13, 2, "#c5a36e", "#7d6c4c");
      for (let x = -w * 0.4; x < w * 0.4; x += 16) {
        c.fillStyle = "#eee0b9";
        c.fillRect(x, h * 0.1, 7, 12);
      }
    }
    if (b.id === "barn" || b.id === "boss") {
      c.fillStyle = "#eee0ba";
      for (const [x, y, r] of [
        [0, 0, 5],
        [-8, -8, 2.5],
        [0, -11, 2.5],
        [8, -8, 2.5],
      ]) {
        c.beginPath();
        c.arc(x, -h * 0.1 + y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
    label(c, b.name, b.x * S, b.y * S - h * 0.7 - 34, 40);
  }
  const field = villagePoint(2060, 900);
  label(c, "农田", field.x * S, field.y * S, 40);
  // The farm landmark uses the same timber/roof palette as the physical windmill.
  const wind = villagePoint(2240, 815);
  c.save();
  c.translate(wind.x * S, wind.y * S);
  poly(
    c,
    [
      [-11, 14],
      [-7, -21],
      [7, -21],
      [11, 14],
    ],
    "#c2ae85",
  );
  poly(
    c,
    [
      [-13, -21],
      [0, -35],
      [13, -21],
    ],
    "#8a7457",
  );
  c.strokeStyle = "#776444";
  c.lineWidth = 4;
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    c.beginPath();
    c.moveTo(Math.cos(a) * -26, -10 + Math.sin(a) * -26);
    c.lineTo(Math.cos(a) * 26, -10 + Math.sin(a) * 26);
    c.stroke();
  }
  c.restore();
  for (const [x, y] of [
    [1850, 815],
    [2200, 1030],
    [2210, 1280],
  ]) {
    const p = villagePoint(x, y);
    c.save();
    c.translate(p.x * S, p.y * S);
    rounded(c, -12, -9, 24, 18, 6, "#c6ad6c", "#8e7b4d");
    c.strokeStyle = "#a18a52";
    c.beginPath();
    c.ellipse(-7, 0, 4, 7, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  for (const item of villageDecorations) {
    if (item.kind === "hay") continue;
    c.fillStyle = item.kind.startsWith("flower") ? "#e5d6aa" : "#67814e";
    c.beginPath();
    c.ellipse(item.x * S, item.y * S, 3, 2, 0, 0, Math.PI * 2);
    c.fill();
  }
  const spawn = villagePoint(260, 1530);
  label(c, "出生地", spawn.x * S, spawn.y * S + 38, 40);
  // A simple compass and a restrained paper frame make the map read as a field chart.
  c.fillStyle = "#f0e7cb";
  c.strokeStyle = "#617652";
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(W - 93, H - 117, 63, 84, 10);
  c.fill();
  c.stroke();
  c.fillStyle = "#4b6548";
  c.font = "bold 23px sans-serif";
  c.textAlign = "center";
  c.fillText("北", W - 62, H - 88);
  poly(
    c,
    [
      [W - 62, H - 74],
      [W - 73, H - 48],
      [W - 62, H - 54],
      [W - 51, H - 48],
    ],
    "#5f7a50",
  );
  c.strokeStyle = "#7f7958";
  c.lineWidth = 8;
  c.strokeRect(4, 4, W - 8, H - 8);
  return canvas;
}
export function drawVillageMap(
  canvas: HTMLCanvasElement,
  r: Raid,
  large = false,
) {
  atlas ??= createAtlas();
  const c = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height;
  const viewW = large ? VILLAGE_WIDTH : 1800,
    viewH = large ? VILLAGE_HEIGHT : (viewW * h) / w;
  const x = large
      ? 0
      : Math.max(0, Math.min(VILLAGE_WIDTH - viewW, r.p.x - viewW / 2)),
    y = large
      ? 0
      : Math.max(0, Math.min(VILLAGE_HEIGHT - viewH, r.p.y - viewH / 2));
  Object.assign(canvas.dataset, {
    viewX: String(x),
    viewY: String(y),
    viewWidth: String(viewW),
    viewHeight: String(viewH),
  });
  c.clearRect(0, 0, w, h);
  c.drawImage(atlas, x * S, y * S, viewW * S, viewH * S, 0, 0, w, h);
  const point = (px: number, py: number) => ({
    x: ((px - x) / viewW) * w,
    y: ((py - y) / viewH) * h,
  });
  const pin = (
    px: number,
    py: number,
    color: string,
    symbol: string,
    size = large ? 16 : 10,
  ) => {
    const p = point(px, py);
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) return;
    rounded(c, p.x - size, p.y - size, size * 2, size * 2, 6, color, "#f1e7cd");
    c.fillStyle = "#fff6dc";
    c.font = `bold ${size + 5}px sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(symbol, p.x, p.y + 1);
  };
  for (const e of r.exits) {
    const p = point(e.x, e.y),
      radius = large ? 25 : 12;
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
    c.save();
    c.globalAlpha = e.active ? 1 : 0.65;
    c.fillStyle = "#83e59b30";
    c.strokeStyle = "#78ed93";
    c.lineWidth = large ? 6 : 3;
    if (!e.active) c.setLineDash([6, 4]);
    c.beginPath();
    c.arc(p.x, p.y, radius, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
    // Two direct labels replace the removed color legend; clamp to the paper edge.
    const type = `${e.paid ? "付费撤离" : "免费撤离"}${e.active ? "" : "（关闭）"}`;
    const size = large ? 34 : 21;
    c.font = `bold ${size}px sans-serif`;
    const width =
      Math.max(c.measureText(type).width, c.measureText(e.name).width) + 20;
    const x = Math.max(width / 2 + 8, Math.min(w - width / 2 - 8, p.x));
    const bottom = p.y + radius + 12,
      height = size * 2.55;
    const y =
      large && !e.paid && e.name.includes(" A")
        ? p.y - radius - height - 12
        : Math.min(h - height - 8, bottom);
    rounded(c, x - width / 2, y, width, height, 8, "#e9e5cbeF", "#71966a");
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#285a37";
    c.fillText(type, x, y + size * 0.72);
    c.font = `bold ${size + 2}px sans-serif`;
    c.fillStyle = "#2f4533";
    c.fillText(e.name, x, y + size * 1.85);
  }
  for (const e of r.enemies)
    if (e.boss) {
      pin(e.x, e.y, "#aa5745", "首");
      if (large) {
        const p = point(e.x, e.y);
        c.font = "bold 36px sans-serif";
        c.lineWidth = 5;
        c.strokeStyle = "#f1e7cd";
        c.fillStyle = "#8e4437";
        c.textAlign = "center";
        c.strokeText(e.boss.name, p.x, p.y + 48);
        c.fillText(e.boss.name, p.x, p.y + 48);
      }
    }
  const p = point(r.p.x, r.p.y);
  c.beginPath();
  c.arc(p.x, p.y, large ? 22 : 11, 0, Math.PI * 2);
  c.fillStyle = "#f5da94";
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = "#665c39";
  c.stroke();
  c.beginPath();
  c.moveTo(
    p.x + Math.cos(r.p.angle) * (large ? 26 : 15),
    p.y + Math.sin(r.p.angle) * (large ? 26 : 15),
  );
  c.lineTo(
    p.x + Math.cos(r.p.angle) * (large ? 44 : 27),
    p.y + Math.sin(r.p.angle) * (large ? 44 : 27),
  );
  c.strokeStyle = "#fff6d6";
  c.lineWidth = 3;
  c.stroke();
  if (large) {
    c.font = "bold 36px sans-serif";
    c.textAlign = "center";
    c.strokeStyle = "#495b3e";
    c.lineWidth = 5;
    c.strokeText("玩家", p.x, p.y + 52);
    c.fillStyle = "#fff4ce";
    c.fillText("玩家", p.x, p.y + 52);
  }
}
