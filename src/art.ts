import { reloadPose } from "./reload-motion";
import { db, colors, type Item } from "./data";
import { equipmentSprite, drawEquipment } from "./equipment-art";
const shapes: Record<string, string> = {
  rifle:
    '<path d="M10 34h40v-8H22l-4 3H8v8h8l-3 14h9l5-14h9v8h6V34m8-4h9"/><path d="M30 25v-6h10v6"/>',
  smg: '<path d="M13 27h32v11H30v16h-8V38h-8l-5 8H4l5-14H4v-6h9m33 4h12"/><path d="M33 24v-6h7v6"/>',
  sniper:
    '<path d="M7 34h43v-6H22l-5 4H7v8l8-3-4 14h8l5-14h14v8h5V34m8-3h10M27 26v-9h17v6H27"/>',
  armor:
    '<path d="M21 11l10 6 11-6 11 12-8 9v22H18V32l-8-9z"/><path d="M23 30h17v18H23zM27 19l5 9 5-9"/>',
  helmet:
    '<path d="M12 36c0-18 7-24 20-24s20 6 20 24l5 4H7zM17 40v9l9 4m21-13v9l-9 4"/><path d="M16 21l-1-13 13 8m8 0L49 8l-2 14"/>',
  bag: '<rect x="15" y="16" width="35" height="39" rx="9"/><path d="M24 16v-5h16v5M10 28v16m45-16v16M20 34h25v15H20zM26 23h13"/>',
  ammo: '<path d="M13 49V24l5-12 5 12v25zm16 0V20l5-12 5 12v29zm16 0V28l5-12 5 12v21zM13 43h10m6 0h10m6 0h10"/>',
  fish: '<path d="M9 33c12-19 29-19 40 0-11 18-28 18-40 0zm39 0 12-11v22z"/><circle cx="20" cy="30" r="2"/><path d="M30 21l6-7 4 10m-9 18 5 7 3-10"/>',
  tube: '<path d="M23 9h20l-4 44H27zM25 15h16M28 45h11"/><path d="M28 27l5-4 5 4-2 7h-6z"/>',
  can: '<ellipse cx="32" cy="17" rx="20" ry="8"/><path d="M12 17v30c0 10 40 10 40 0V17M13 29h38M13 44h38"/><ellipse cx="32" cy="16" rx="7" ry="3"/>',
  meal: '<path d="M9 36h46c-2 14-44 14-46 0zM12 32c0-20 40-20 40 0zM32 13V8"/><path d="M24 26l6-3 4 5 7-4"/>',
  bell: '<path d="M14 43c7-10 2-27 18-27s11 17 18 27zM27 49c0 9 10 9 10 0M32 16v-7"/>',
  wood: '<path d="M13 20l35-8 7 35-35 8zM23 23l20-5M24 31l17-4M26 41l19-4"/>',
  coin: '<ellipse cx="32" cy="33" rx="21" ry="23"/><ellipse cx="32" cy="33" rx="16" ry="18"/><path d="M23 31l3-8 6 6 6-6 3 8v11H23z"/>',
  tool: '<path d="M43 10l-3 11 7 5 10-5c3 16-15 20-21 13L17 55l-8-8 21-20c-6-10 1-20 13-17z"/>',
  shoe: '<path d="M18 13h16v22l19 7v11H10V39l8-9zM25 34l10 4m-7 2 9 4M11 48h40"/>',
  headphone:
    '<path d="M12 36v-7c0-26 40-26 40 0v7M10 29h10v23H10zm34 0h10v23H44z"/>',
  box: '<path d="M10 22l22-12 22 12v27L32 59 10 49zM10 22l22 11 22-11M32 33v26M22 16l23 11v9"/>',
  wand: '<path d="M12 54l28-30M38 25l5-16 5 9 10 4-17 6M11 13v8m-4-4h8M45 44v9m-4-4h8"/>',
  leaf: '<path d="M14 48C5 17 32 7 54 11c1 24-13 43-40 37zm0 0 29-26M28 34V21m-6 20 21-2"/>',
  board:
    '<path d="M16 11h32v45H16zM22 17l20 9m-20-1 20 9m-20-1 20 9m-20-1 20 9"/>',
  phone:
    '<rect x="18" y="8" width="29" height="48" rx="5"/><path d="M23 15h19v31H23zM29 51h7"/>',
  book: '<path d="M12 14c8-5 14-3 20 1 7-5 13-6 21-1v39c-8-4-14-4-21 0-7-4-13-4-20 0zM32 15v38M17 23h9m-9 7h9m11-7h10m-10 7h10"/>',
  keyboard:
    '<path d="M8 22h49v26H8zM13 28h39M13 35h39M15 42h5m5 0h20M20 27v9m8-9v9m8-9v9m8-9v9"/>',
  bed: '<path d="M8 37l24-15 24 15-24 16zM8 37v9l24 15 24-15v-9M18 30V15l14-6 14 6v15"/>',
  bottle: '<path d="M25 9h14v9l7 10v24H18V28l7-10zM25 15h14M18 32h28v13H18"/>',
  fries:
    '<path d="M14 28h38l-6 29H20zM18 28V10h7v18m3 0V6h7v22m3 0V13h7v15m2 0V8h5v20M24 39l7 8 8-8"/>',
  collar:
    '<path d="M10 28c4-22 41-22 45 0 0 20-45 20-45 0zM17 25c3-12 29-12 32 0M27 40v12l6 5 7-5V40M30 47h7"/>',
  mouse:
    '<path d="M16 29c0-26 33-26 33 0v13c0 22-33 22-33 0zM32 11v20M17 31h31M32 21v5"/>',
  purse:
    '<path d="M12 24h42v31H12zM22 24v-8c0-11 22-11 22 0v8M13 26l20 17 20-17"/><circle cx="33" cy="42" r="3"/>',
  key: '<circle cx="23" cy="24" r="13"/><circle cx="23" cy="24" r="5"/><path d="M32 34l20 20 6-6-6-6-4 4-4-4 4-4-7-7"/>',
  cloth:
    '<path d="M15 9h34v46H15zM20 14v34m6-34v34m6-34v34m6-34v34m6-34v34M15 49h34"/>',
  cartridge:
    '<path d="M15 9h33v47H15zM22 9v17h19V9M22 35h20v15H22zM27 40h10"/>',
  gem: '<path d="M20 11h24l13 18-25 29L7 29zM7 29h50M20 11l-3 18 15 29 15-29-3-18M17 29l15-18 15 18"/>',
  watch:
    '<path d="M23 8h19v13M23 43v13h19V43"/><circle cx="32" cy="32" r="17"/><path d="M32 21v11l8 5"/>',
  case: '<rect x="10" y="19" width="45" height="36" rx="5"/><path d="M23 19v-9h19v9M19 20v34m28-34v34M29 35h7v8h-7z"/>',
  top: '<path d="M32 8v13M10 35l22-16 23 16-23 10zM13 36l19 21 20-21M32 45v12"/>',
  pill: '<path d="M15 41l19-24c12-14 30 1 20 14L35 55C24 67 4 53 15 41zM24 30l19 15"/>',
  pipe: '<path d="M10 34h19c6 21 24 18 24-1V20H35v14H10zM43 13c-9-7 6-8 0-14"/>',
  sword: '<path d="M30 7h7l4 31-8 5-8-5zM16 39l17 7 17-7M30 46v13h7V46"/>',
  mask: '<path d="M9 17l15 10h16l15-10-4 29-19 11-18-11zM18 35l10 4m8 0 10-4M29 47h7"/>',
  heart:
    '<path d="M32 56L9 33C-3 14 21 1 32 20 45 1 68 14 55 33zM13 24l13-8 6 10 7-10 13 8-20 24z"/>',
  yarn: '<circle cx="31" cy="30" r="21"/><path d="M13 19l35 23M10 28l32 20M22 10l27 24M42 12L17 45m35-21L29 51M48 46c20-1 11 15 0 11"/>',
  glove:
    '<path d="M20 52V34l-7-12 5-4 9 10V12h6v16l4-20h6l-2 22 6-17 6 2-6 22 7-8 5 5-13 21z"/>',
  painting:
    '<path d="M10 8h45v49H10zM15 13h35v39H15zM23 40l-2-15 8 4 8-4 6 14-10 8z"/>',
  amber:
    '<path d="M20 10l25 5 9 25-19 18-24-11-3-20zM24 24l14 5-4 16-12-7zM15 20l4-4"/>',
  egg: '<path d="M12 36c0-15 12-29 20-29s20 14 20 29c0 28-40 28-40 0zM19 32l9 5 8-6 11 6M25 45h14"/>',
  safe: '<rect x="11" y="10" width="43" height="46" rx="4"/><path d="M17 16h31v33H17zM50 23v12"/><circle cx="33" cy="32" r="8"/><path d="M33 24v16m-8-8h16"/>',
  map: '<path d="M9 16l15-7 16 8 15-8v39l-15 7-16-8-15 7zM24 9v38m16-30v38"/>',
  paw: '<ellipse cx="32" cy="40" rx="16" ry="12"/><ellipse cx="14" cy="25" rx="6" ry="8"/><ellipse cx="27" cy="17" rx="6" ry="8"/><ellipse cx="41" cy="18" rx="6" ry="8"/><ellipse cx="52" cy="28" rx="6" ry="8"/>',
  settings:
    '<path d="M8 17h48M8 32h48M8 47h48"/><rect x="19" y="12" width="8" height="10" rx="2"/><rect x="39" y="27" width="8" height="10" rx="2"/><rect x="24" y="42" width="8" height="10" rx="2"/>',
};
export function icon(name: string, color = "#dfc18b", size = 48) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="${color}22" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.box}</svg>`;
}
export function itemIcon(item: Item, size = 48) {
  const d = db[item.id];
  return equipmentSprite(item.id, size) ?? icon(d.icon, colors[d.tier], size);
}
export type Ctx = CanvasRenderingContext2D;
export function ellipse(
  c: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
export function path(
  c: Ctx,
  points: number[][],
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
export function round(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
) {
  c.fillStyle = fill;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
export function text(
  c: Ctx,
  s: string,
  x: number,
  y: number,
  size = 14,
  color = "#f4eddc",
  align: CanvasTextAlign = "center",
) {
  c.font = `600 ${Math.max(18, size)}px "三角猫黑体", "Microsoft YaHei", sans-serif`;
  c.textAlign = align;
  c.fillStyle = color;
  c.fillText(s, x, y);
}
export function box(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  color: string,
  top?: string,
) {
  ellipse(c, x + 9, y + 6, w * 0.65, 15, "#15272035");
  path(
    c,
    [
      [x - w / 2, y - h / 2],
      [x + w / 2, y - h / 2],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ],
    color,
  );
  path(
    c,
    [
      [x - w / 2, y - h / 2 - z],
      [x + w / 2, y - h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x - w / 2, y + h / 2 - z],
    ],
    top || color,
  );
  path(
    c,
    [
      [x - w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ],
    color,
  );
  path(
    c,
    [
      [x + w / 2, y - h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2],
      [x + w / 2, y - h / 2],
    ],
    "#182a2940",
  );
  c.strokeStyle = "#e9ecd22a";
  c.lineWidth = 1;
  c.strokeRect(x - w / 2 + 3, y - h / 2 - z + 3, w - 6, h - 6);
}
export interface CatArt {
  fur?: string;
  patch?: string;
  eye?: string;
  angle?: number;
  walk?: number;
  scale?: number;
  armor?: number;
  helmet?: boolean;
  player?: boolean;
  hit?: number;
  breed?: number;
  weaponId?: string;
  reloadRemaining?: number;
  reloadTotal?: number;
}
export function cat(c: Ctx, x: number, y: number, o: CatArt = {}) {
  const t = o.walk || 0,
    s = o.scale || 1,
    fur = o.hit && o.hit > 0 ? "#fff4de" : o.fur || "#e9d5ad",
    patch = o.patch || "#b57942";
  c.save();
  c.translate(x, y);
  c.scale(s * (o.breed === 7 || o.breed === 2 ? 1.1 : 1), s);
  ellipse(c, 4, 1, 22, 9, "#142d2a44");
  c.strokeStyle = patch;
  c.lineWidth = 7;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(-9, -12);
  c.bezierCurveTo(-34, -14, -35, -32 + Math.sin(t * 2) * 4, -25, -30);
  c.stroke();
  const step = Math.sin(t) * 3;
  ellipse(c, -9, -3 + step, 7, 5, "#423e32");
  ellipse(c, 9, -3 - step, 7, 5, "#423e32");
  const body = c.createLinearGradient(-14, -30, 15, -8);
  body.addColorStop(0, o.armor ? "#6a7961" : "#d5ba91");
  body.addColorStop(1, o.armor ? "#34493c" : "#9d825f");
  ellipse(c, 0, -19, 17, 19, body as unknown as string);
  round(c, -13, -29, 26, 24, 6, o.armor ? "#485b45" : "#698572");
  round(c, -10, -23, 8, 10, 2, "#a7ab7a");
  round(c, 2, -23, 8, 10, 2, "#83916d");
  c.fillStyle = "#d7b972";
  c.fillRect(-1, -29, 2, 24);
  c.save();
  c.rotate((o.angle ?? 0.3) * 0.12);
  const bob = Math.cos(t * 2) * 1;
  const gy = -48 + bob;
  const bigEars = o.breed === 5 ? 9 : o.breed === 4 ? 4 : 0;
  if (o.breed === 10 || o.breed === 13 || o.breed === 14) {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      path(
        c,
        [
          [Math.cos(a) * 21, gy + Math.sin(a) * 18],
          [Math.cos(a + 0.16) * 28, gy + Math.sin(a + 0.16) * 25],
          [Math.cos(a + 0.34) * 21, gy + Math.sin(a + 0.34) * 18],
        ],
        fur,
      );
    }
    ellipse(c, 0, gy + 15, 24, 12, fur);
  }
  path(
    c,
    [
      [-20, gy - 3],
      [-20 - bigEars * 0.25, gy - 25 - bigEars],
      [-5, gy - 16],
    ],
    fur,
  );
  path(
    c,
    [
      [5, gy - 16],
      [20 + bigEars * 0.25, gy - 25 - bigEars],
      [20, gy - 2],
    ],
    fur,
  );
  path(
    c,
    [
      [-17, gy - 9],
      [-17, gy - 21 - bigEars],
      [-8, gy - 14],
    ],
    "#bf9585",
  );
  path(
    c,
    [
      [8, gy - 14],
      [17, gy - 21 - bigEars],
      [17, gy - 9],
    ],
    "#bf9585",
  );
  const g = c.createRadialGradient(-7, gy - 7, 2, 0, gy, 26);
  g.addColorStop(0, fur);
  g.addColorStop(1, patch);
  ellipse(c, 0, gy, 23, 20, g as unknown as string);
  ellipse(c, 7, gy + 7, 12, 9, fur);
  if (o.player) ellipse(c, -10, gy - 6, 9, 11, "#776a55");
  if (o.breed === 1 || o.breed === 3) {
    c.strokeStyle = patch;
    c.lineWidth = 3;
    for (const k of [-1, 0, 1]) {
      c.beginPath();
      c.moveTo(k * 7, gy - 18);
      c.lineTo(k * 5, gy - 10);
      c.stroke();
    }
  }
  ellipse(c, -9, gy, 4.1, 5, o.eye || "#9dad7b");
  ellipse(c, 9, gy, 4.1, 5, o.eye || "#9dad7b");
  ellipse(c, -9, gy, 1.3, 4, "#1c302d");
  ellipse(c, 9, gy, 1.3, 4, "#1c302d");
  ellipse(c, -10, gy - 2, 1.2, 1.2, "#fff");
  ellipse(c, 8, gy - 2, 1.2, 1.2, "#fff");
  path(
    c,
    [
      [-3, gy + 7],
      [3, gy + 7],
      [0, gy + 10],
    ],
    "#a46a66",
  );
  c.strokeStyle = "#665b4e";
  c.lineWidth = 0.8;
  for (const a of [-1, 1]) {
    c.beginPath();
    c.moveTo(a * 10, gy + 7);
    c.lineTo(a * 26, gy + 4);
    c.moveTo(a * 12, gy + 10);
    c.lineTo(a * 25, gy + 12);
    c.stroke();
  }
  if (o.helmet) {
    path(
      c,
      [
        [-24, gy - 7],
        [-18, gy - 23],
        [0, gy - 28],
        [19, gy - 23],
        [24, gy - 7],
      ],
      "#52664e",
    );
    round(c, -24, gy - 12, 48, 7, 3, "#7e8b63");
    round(c, -5, gy - 25, 10, 9, 2, "#c5b16e");
  }
  c.restore();
  const angle = o.angle ?? 0.3;
  c.save();
  c.translate(3, -20);
  const reload = reloadPose(o.reloadRemaining ?? 0, o.reloadTotal ?? 1);
  c.rotate(angle + reload.hold * 0.15);
  c.save();
  if (reload.active) {
    c.beginPath();
    c.rect(-100, -100, 200, 200);
    c.rect(10, -1, 10, 20);
    c.clip("evenodd");
  }
  if (!o.weaponId || !drawEquipment(c, o.weaponId, -14, -19, 72, 42)) {
    round(c, 2, -4, 35, 8, 2, "#303d37");
    round(c, 7, -5, 19, 7, 2, "#657561");
    round(c, 31, -2, 16, 4, 1, "#23302c");
    round(c, 12, 2, 7, 9, 1, "#31443b");
  }
  c.restore();
  if (reload.active) {
    const mx = 12 + 10 * reload.detached,
      my = 2 + 13 * reload.detached;
    c.save();
    c.translate(mx, my);
    c.rotate(-0.3 * reload.detached);
    round(c, 0, 0, 6, 12, 1.5, "#f3dea3");
    round(c, 0, 9, 6, 3, 1, "#183b45");
    c.restore();
    ellipse(c, mx + 6, my + 7, 5, 4, fur);
  }
  c.restore();
  ellipse(c, Math.cos(angle) * 10, -20 + Math.sin(angle) * 10, 6, 5, fur);
  c.restore();
}
export function tree(c: Ctx, x: number, y: number, s = 1, snow = false) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  ellipse(c, 16, 4, 42, 16, "#16352d35");
  round(c, -7, -65, 14, 65, 3, "#796d4f");
  for (let i = 0; i < 3; i++) {
    path(
      c,
      [
        [0, -135 + i * 30],
        [-43 + i * 3, -58 + i * 30],
        [43 - i * 3, -58 + i * 30],
      ],
      snow
        ? ["#cfdfd7", "#b2c9c0", "#88a89b"][i]
        : ["#607958", "#516e4d", "#425d42"][i],
    );
    path(
      c,
      [
        [0, -135 + i * 30],
        [-43 + i * 3, -58 + i * 30],
        [0, -70 + i * 30],
      ],
      "#e0edcb16",
    );
  }
  c.restore();
}
