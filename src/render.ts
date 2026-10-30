import { drawProjectileTrail, projectileTrailLength } from "./combat-visuals";
import {
  containerHighlighted,
  containerHighlightColor,
} from "./container-info";
import { drawContainerSprite } from "./container-sprites";
import { drawVillageMap } from "./village-map";
import { drawVillageGround } from "./village-ground";
import { cat, box, tree, ellipse, round, path, text, type Ctx } from "./art";
import { maps, breeds, colors, rng, EXTRACT_SECONDS } from "./data";
import { type Raid, type Rect, type Enemy } from "./raid";
export class Renderer {
  ctx: Ctx;
  canvas: HTMLCanvasElement;
  camera = { x: 0, y: 0 };
  ground?: HTMLCanvasElement;
  groundSeed = 0;
  width = 1280;
  height = 720;
  scale = 1;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }
  resize() {
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.scale = Math.max(0.68, Math.min(1.3, this.width / 1440));
  }
  screenToWorld(x: number, y: number) {
    return {
      x: x / this.scale + this.camera.x,
      y: y / this.scale + this.camera.y,
    };
  }
  prepare(r: Raid) {
    if (this.groundSeed === r.seed && this.ground) return;
    this.groundSeed = r.seed;
    const c = document.createElement("canvas");
    c.width = r.map === 0 ? 4096 : r.width;
    c.height = r.map === 0 ? Math.round((4096 * r.height) / r.width) : r.height;
    const g = c.getContext("2d")!,
      m = maps[r.map],
      random = rng(r.seed);
    if (r.map === 0) {
      g.scale(c.width / r.width, c.height / r.height);
      drawVillageGround(g);
      this.ground = c;
      return;
    }
    g.fillStyle = m.ground;
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 9000; i++) {
      const x = random() * c.width,
        y = random() * c.height;
      g.fillStyle = random() > 0.5 ? "#e4e7bf0b" : "#253c2a0e";
      g.fillRect(x, y, 2 + random() * 7, 1 + random() * 3);
    }
    g.strokeStyle = r.map === 3 ? "#e5efeb" : "#b3aa87";
    g.lineWidth = 100;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(250, 1500);
    g.lineTo(300, 900);
    g.lineTo(1100, 900);
    g.lineTo(2100, 900);
    g.lineTo(2180, 1500);
    g.moveTo(1100, 1620);
    g.lineTo(1100, 290);
    g.stroke();
    g.strokeStyle = "#eff2d21b";
    g.lineWidth = 1;
    for (let y = 220; y < 1700; y += 36) {
      g.beginPath();
      g.moveTo(1040, y);
      g.lineTo(1160, y);
      g.stroke();
    }
    for (const [x, y, w, h] of r.rooms) {
      g.fillStyle = m.floor;
      g.fillRect(x - w / 2, y - h / 2, w, h);
      g.strokeStyle = "#344c3b20";
      g.lineWidth = 1;
      for (let px = x - w / 2; px < x + w / 2; px += 50) {
        g.beginPath();
        g.moveTo(px, y - h / 2);
        g.lineTo(px, y + h / 2);
        g.stroke();
      }
      for (let py = y - h / 2; py < y + h / 2; py += 50) {
        g.beginPath();
        g.moveTo(x - w / 2, py);
        g.lineTo(x + w / 2, py);
        g.stroke();
      }
    }
    if (r.map === 1) {
      g.fillStyle = "#515e56";
      g.fillRect(200, 855, 2000, 95);
      g.setLineDash([35, 25]);
      g.strokeStyle = "#cabc8c";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(200, 903);
      g.lineTo(2200, 903);
      g.stroke();
      g.setLineDash([]);
    }
    if (r.map === 2) {
      g.fillStyle = "#426b71";
      g.fillRect(2245, 0, 160, 1800);
      for (let y = 0; y < 1800; y += 22) {
        g.strokeStyle = "#b8d2c431";
        g.beginPath();
        g.moveTo(2255, y);
        g.quadraticCurveTo(2320, y - 10, 2380, y);
        g.stroke();
      }
    }
    for (let i = 0; i < 160; i++) {
      const x = random() * 2400,
        y = random() * 1800;
      if (
        r.walls.some(
          (w) =>
            Math.abs(x - w.x) < w.w / 2 + 60 &&
            Math.abs(y - w.y) < w.h / 2 + 80,
        )
      )
        continue;
      ellipse(g, x, y, 2, 1.2, r.map === 3 ? "#ebf2e7" : "#b4bc86");
    }
    for (let i = 0; i < 4; i++) {
      const [x, y] = r.rooms[i];
      text(g, `0${i + 1} / ${m.zones[i]}`, x, y + 65, 24, "#273d2c40");
    }
    this.ground = c;
  }
  raid(r: Raid) {
    this.resize();
    this.prepare(r);
    const c = this.ctx,
      s = this.scale,
      vw = this.width / s,
      vh = this.height / s;
    this.camera.x = Math.max(
      -40,
      Math.min(r.width - vw + 40, r.p.x - vw * 0.5),
    );
    this.camera.y = Math.max(
      -40,
      Math.min(r.height - vh + 40, r.p.y - vh * 0.55),
    );
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = maps[r.map].ground;
    c.fillRect(0, 0, this.width, this.height);
    c.save();
    c.scale(s, s);
    const shake = r.shake * r.save.settings.shake;
    c.translate(
      -this.camera.x + Math.sin(r.elapsed * 140) * shake,
      -this.camera.y + Math.cos(r.elapsed * 180) * shake,
    );
    c.drawImage(this.ground!, 0, 0);
    for (const exit of r.exits) {
      const active = exit.active;
      if (active && (!exit.paid || exit.bought)) {
        for (let n = 0; n < 8; n++) {
          const phase = (r.elapsed * 0.23 + n / 8) % 1,
            px = exit.x + Math.sin(n + r.elapsed) * 14,
            py = exit.y - phase * 170;
          const radius = 9 + phase * 20,
            alpha = Math.sin(phase * Math.PI) * 0.6,
            g = c.createRadialGradient(px, py, 0, px, py, radius);
          g.addColorStop(0, `rgba(109,255,153,${alpha})`);
          g.addColorStop(1, "rgba(58,205,119,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(px, py, radius, 0, Math.PI * 2);
          c.fill();
        }
      } else if (active && exit.paid) {
        ellipse(c, exit.x, exit.y - 105, 22, 22, "#edbf4e");
        text(c, "◈", exit.x, exit.y - 96, 26, "#69471e");
      }
      ellipse(c, exit.x, exit.y, 64, 32, active ? "#cee1af2f" : "#37483c44");
      c.strokeStyle = active ? "#c2dcaa" : "#89998a";
      c.lineWidth = 3;
      c.setLineDash([10, 6]);
      c.beginPath();
      c.ellipse(exit.x, exit.y, 62, 31, 0, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      text(
        c,
        exit.name,
        exit.x,
        exit.y - 60,
        15,
        active ? "#f2ead2" : "#bdc7b8",
      );
      text(
        c,
        !active
          ? "本局关闭"
          : exit.paid
            ? exit.bought
              ? "撤离已启动"
              : `${maps[r.map].fee} 金币 · E 启动`
            : `免费撤离 · 停留 ${EXTRACT_SECONDS} 秒`,
        exit.x,
        exit.y - 40,
        12,
        active ? "#d1dfbe" : "#a5b2a5",
      );
      if (exit === r.exit && r.extract > 0) {
        c.strokeStyle = "#eed69c";
        c.lineWidth = 6;
        c.beginPath();
        c.arc(
          exit.x,
          exit.y - 36,
          16,
          -Math.PI / 2,
          -Math.PI / 2 + (Math.PI * 2 * r.extract) / 5,
        );
        c.stroke();
      }
    }
    const sorted: { y: number; draw: () => void }[] = [];
    for (const w of r.walls)
      sorted.push({ y: w.y + w.h / 2, draw: () => this.prop(c, w, r) });
    for (const con of r.containers) {
      sorted.push({
        y: con.y + 12,
        draw: () => {
          if (drawContainerSprite(c, con, r)) return;
          if (con.type === "corpse") {
            ellipse(c, con.x, con.y, 21, 10, "#263e3350");
            round(c, con.x - 17, con.y - 22, 34, 23, 6, "#6e7456");
            round(c, con.x - 11, con.y - 18, 23, 12, 3, "#9a9b70");
            c.strokeStyle = "#b5ad7c";
            c.strokeRect(con.x - 3, con.y - 21, 6, 22);
          } else if (con.type === "safe") {
            box(c, con.x, con.y, 42, 25, 38, "#4a6056", "#849082");
            ellipse(c, con.x + 3, con.y - 17, 6, 6, "#d4b982");
            c.fillStyle = "#354c40";
            c.fillRect(con.x + 1, con.y - 21, 3, 8);
          } else {
            const color =
              con.type === "medical"
                ? "#aeb5a1"
                : con.type === "weapon"
                  ? "#4e6550"
                  : con.type === "bed"
                    ? "#aa8378"
                    : "#a79966";
            box(
              c,
              con.x,
              con.y,
              con.type === "weapon" ? 58 : 43,
              28,
              25,
              color,
            );
            c.strokeStyle = "#d5c69a";
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(con.x - 14, con.y - 28);
            c.lineTo(con.x + 14, con.y - 28);
            c.stroke();
            if (con.type === "medical") {
              c.fillStyle = "#d4ddc2";
              c.fillRect(con.x - 3, con.y - 21, 6, 14);
              c.fillRect(con.x - 7, con.y - 17, 14, 6);
            }
          }
          if (Math.hypot(con.x - r.p.x, con.y - r.p.y) < 110) {
            if (r.search === con && con.revealed < con.items.length) {
              const total = importSearchTime(con.items[con.revealed]);
              c.strokeStyle = colors[importTier(con.items[con.revealed])];
              c.lineWidth = 3;
              c.beginPath();
              c.arc(
                con.x,
                con.y - 86,
                12,
                -Math.PI / 2,
                -Math.PI / 2 + (r.searchProgress / total) * Math.PI * 2,
              );
              c.stroke();
            }
          }
        },
      });
    }
    for (const e of r.enemies)
      sorted.push({ y: e.y, draw: () => this.enemy(c, e, r) });
    sorted.push({
      y: r.p.y,
      draw: () => {
        const p = r.p;
        c.save();
        if (p.roll) {
          c.translate(p.x, p.y - 15);
          c.rotate((0.35 - p.roll) * Math.PI * 4);
          cat(c, 0, 15, {
            player: true,
            weaponId: r.weaponItem?.id,
            reloadRemaining: r.reload,
            reloadTotal: r.weapon?.reload,
            walk: p.walk,
            angle: p.angle,
            armor: 1,
            helmet: !!r.save.equipment.helmet,
            fur: "#e8d2aa",
            patch: "#b78954",
            hit: p.hit,
          });
        } else
          cat(c, p.x, p.y, {
            player: true,
            weaponId: r.weaponItem?.id,
            reloadRemaining: r.reload,
            reloadTotal: r.weapon?.reload,
            walk: p.walk,
            angle: p.angle,
            armor: r.save.equipment.armor ? 1 : 0,
            helmet: !!r.save.equipment.helmet,
            hit: p.hit,
          });
        c.restore();
        ellipse(c, p.x, p.y + 8, 3, 2, "#edd8a0");
      },
    });
    const random = rng(440);
    for (let i = 0; i < 60; i++) {
      const side = i % 4,
        x = side === 0 ? 60 : side === 1 ? 2340 : 100 + random() * 2200,
        y = side === 2 ? 100 : side === 3 ? 1750 : 100 + random() * 1600;
      sorted.push({
        y,
        draw: () => tree(c, x, y, 0.65 + random() * 0.45, r.map === 3),
      });
    }
    sorted.sort((a, b) => a.y - b.y).forEach((d) => d.draw());
    for (const b of r.bullets) {
      const speed = Math.hypot(b.vx, b.vy),
        length = projectileTrailLength(b);
      drawProjectileTrail(
        c,
        b,
        { x: b.x, y: b.y },
        { x: b.x - (b.vx / speed) * length, y: b.y - (b.vy / speed) * length },
      );
    }
    for (const e of r.enemies)
      if (e.telegraph) {
        const t = e.telegraph;
        c.fillStyle = "#e09d6b35";
        ellipse(c, t.x, t.y, 70, 42, "#e6885c42");
        c.strokeStyle = "#ffd193";
        c.lineWidth = 2;
        c.beginPath();
        c.ellipse(
          t.x,
          t.y,
          (70 * t.time) / 1.3,
          (42 * t.time) / 1.3,
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
    for (const p of r.particles) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      ellipse(c, p.x, p.y, p.size, p.size, p.color);
    }
    c.globalAlpha = 1;
    for (const f of r.floating) {
      c.globalAlpha = Math.min(1, f.life * 3);
      text(c, f.text, f.x, f.y, 18, f.color);
    }
    c.globalAlpha = 1;
    for (const con of r.containers) {
      if (!containerHighlighted(con, r)) continue;
      const label = `${r.near === con && !r.search && !r.puzzle ? "E " : ""}${con.name}`;
      c.font = '600 23px "三角猫黑体", "Microsoft YaHei", sans-serif';
      const width = c.measureText(label).width + 20;
      round(c, con.x - width / 2, con.y - 105, width, 34, 9, "#203d32e8");
      text(c, label, con.x, con.y - 80, 23, containerHighlightColor(con));
    }
    if (r.exit?.paid && !r.exit.bought)
      text(c, "E  支付并撤离", r.p.x, r.p.y - 105, 16, "#f4d69e");
    c.restore();
    const vignette = c.createRadialGradient(
      this.width / 2,
      this.height / 2,
      this.height * 0.15,
      this.width / 2,
      this.height / 2,
      this.width * 0.7,
    );
    vignette.addColorStop(0, "#182d2200");
    vignette.addColorStop(1, "#132a283d");
    c.fillStyle = vignette;
    c.fillRect(0, 0, this.width, this.height);
    if (r.p.hit > 0) {
      c.fillStyle = `rgba(194,77,45,${r.p.hit * 0.5})`;
      c.fillRect(0, 0, this.width, this.height);
    }
  }
  prop(c: Ctx, w: Rect, r: Raid) {
    const hide =
      w.y > r.p.y &&
      Math.abs(r.p.x - w.x) < w.w / 2 + 20 &&
      w.y - r.p.y < w.z + 55;
    if (hide) c.globalAlpha = 0.28;
    box(c, w.x, w.y, w.w, w.h, w.z, w.color);
    if (w.type === "wall") {
      c.fillStyle = "#d8d4a447";
      c.fillRect(w.x - w.w / 2 + 3, w.y + w.h / 2 - w.z + 3, w.w - 6, 4);
      if (w.label) text(c, w.label, w.x, w.y - w.z - 23, 19, "#f3ebd2");
    } else if (w.type === "vehicle") {
      round(
        c,
        w.x - w.w * 0.25,
        w.y - w.z + 4,
        w.w * 0.5,
        w.h * 0.38,
        3,
        "#4b6b6b",
      );
      round(c, w.x - w.w * 0.4, w.y - 5, 12, 13, 3, "#354239");
      round(c, w.x + w.w * 0.25, w.y - 5, 12, 13, 3, "#354239");
      c.fillStyle = "#e0c28b";
      c.fillRect(w.x - w.w * 0.45, w.y - w.z + 9, 5, 9);
      c.fillRect(w.x + w.w * 0.4, w.y - w.z + 9, 5, 9);
    } else if (w.type === "terminal") {
      round(c, w.x - w.w * 0.35, w.y - w.z - 8, w.w * 0.7, 26, 3, "#35545a");
      round(c, w.x - w.w * 0.3, w.y - w.z - 5, w.w * 0.6, 18, 2, "#90c2b5");
      c.strokeStyle = "#d9e9ca";
      c.beginPath();
      c.moveTo(w.x - 16, w.y - w.z + 8);
      c.lineTo(w.x - 7, w.y - w.z + 2);
      c.lineTo(w.x + 1, w.y - w.z + 9);
      c.lineTo(w.x + 18, w.y - w.z - 1);
      c.stroke();
      for (let i = -2; i <= 2; i++) {
        c.fillStyle = i % 2 ? "#e6c990" : "#8cae9a";
        c.fillRect(w.x + i * 11, w.y - 17, 5, 4);
      }
    } else if (w.type === "stall") {
      path(
        c,
        [
          [w.x - w.w * 0.58, w.y - w.z - 24],
          [w.x + w.w * 0.58, w.y - w.z - 24],
          [w.x + w.w * 0.6, w.y - w.z + 5],
          [w.x - w.w * 0.6, w.y - w.z + 5],
        ],
        "#a57b65",
      );
      for (let i = -2; i <= 2; i++)
        round(
          c,
          w.x + (i * w.w) / 5 - 5,
          w.y - w.z + 1,
          w.w / 5,
          9,
          3,
          i % 2 ? "#b5bea0" : "#c8a184",
        );
    } else if (w.type === "barrel") {
      for (let i = -1; i <= 1; i++)
        ellipse(c, w.x + i * 20, w.y - w.z + 4, 10, 8, "#657c65");
    } else {
      c.strokeStyle = "#565e42";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(w.x - w.w / 2 + 6, w.y - w.z - w.h / 2 + 5);
      c.lineTo(w.x + w.w / 2 - 6, w.y - w.z + w.h / 2 - 5);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  enemy(c: Ctx, e: Enemy, r: Raid) {
    const b =
      e.breed >= 0
        ? breeds[e.breed]
        : { fur: "#d9b1a5", patch: "#b18885", eye: "#a0c4ca" };
    if (e.turret) {
      box(c, e.x, e.y, 26, 25, 30, "#526c66");
      c.save();
      c.translate(e.x, e.y - 25);
      c.rotate(e.angle);
      round(c, -6, -5, 40, 10, 3, "#354a46");
      c.restore();
    } else
      cat(c, e.x, e.y, {
        weaponId: `w${e.weapon}`,
        fur: b.fur,
        patch: b.patch,
        eye: b.eye,
        breed: e.breed,
        armor: e.tier,
        helmet: e.tier > 1 && e.breed !== -1,
        angle: e.angle,
        walk: e.walk,
        scale: e.boss ? (e.boss.skill === "charge" ? 1.55 : 1.24) : 1,
        hit: e.hit,
      });
    const close = Math.hypot(e.x - r.p.x, e.y - r.p.y) < 650;
    if (e.state === "investigate") {
      text(c, "？", e.x, e.y - (e.boss ? 140 : 104) - 48, 32, "#ffe478");
    }
    const enemyName = e.boss?.name ?? breeds[e.breed]?.name ?? "自动炮塔";
    c.font = '600 26px "三角猫黑体",sans-serif';
    const nameWidth = c.measureText(enemyName).width + 18;
    round(
      c,
      e.x - nameWidth / 2,
      e.y - (e.boss ? 140 : 104) - 29,
      nameWidth,
      36,
      8,
      "#242033ed",
    );
    text(
      c,
      e.boss?.name ?? breeds[e.breed]?.name ?? "自动炮塔",
      e.x,
      e.y - (e.boss ? 140 : 104),
      26,
      e.boss ? "#ff3d50" : "#ffd35c",
    );
    if (close && (e.state === "combat" || e.hit > 0)) {
      const size = e.boss ? 85 : 40;
      round(
        c,
        e.x - size / 2,
        e.y - (e.boss ? 111 : 88),
        size,
        5,
        2,
        "#273d36",
      );
      round(
        c,
        e.x - size / 2,
        e.y - (e.boss ? 111 : 88),
        size * Math.max(0, e.hp / e.maxHp),
        5,
        2,
        e.boss ? "#e4b879" : "#d8b18b",
      );
    }
    if (e.shield > 0) {
      c.strokeStyle = "#a5d8e3";
      c.lineWidth = 4;
      c.beginPath();
      c.arc(e.x, e.y - 25, 44, -1.7 + e.angle, 1.7 + e.angle);
      c.stroke();
    }
    if (e.state === "investigate") text(c, "?", e.x, e.y - 88, 22, "#e8d6a7");
    if (
      e.boss &&
      e.state === "combat" &&
      e.boss.skill === "charge" &&
      e.telegraph
    ) {
      text(c, "蓄力冲撞", e.x, e.y - 130, 17, "#ffda9e");
    }
  }
}
import {
  searchTime as importSearchTime,
  db as itemDb,
  type Item,
} from "./data";
const importTier = (i: Item) => itemDb[i.id].tier;
export function miniMap(canvas: HTMLCanvasElement, r: Raid, large = false) {
  if (r.map === 0) {
    drawVillageMap(canvas, r, large);
    return;
  }
  const c = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height,
    sx = w / r.width,
    sy = h / r.height;
  c.clearRect(0, 0, w, h);
  round(c, 0, 0, w, h, 10, "#243d36");
  c.save();
  c.scale(sx, sy);

  c.fillStyle = "#80917c";
  for (const wall of r.walls)
    c.fillRect(wall.x - wall.w / 2, wall.y - wall.h / 2, wall.w, wall.h);
  for (const con of r.containers)
    if (con.items.length && large)
      ellipse(
        c,
        con.x,
        con.y,
        14,
        14,
        con.type === "safe" ? "#eac786" : "#9aaf94",
      );
  for (const e of r.enemies)
    if (e.boss) {
      ellipse(c, e.x, e.y, 24, 24, "#e19978");
      if (large) text(c, e.boss.name, e.x, e.y - 40, 38, "#efd9bf");
    }
  for (const e of r.exits) {
    ellipse(c, e.x, e.y, 28, 28, e.active ? "#a5d4b0" : "#60766d");
    if (large)
      text(
        c,
        `${e.name}${!e.active ? "（关闭）" : ""}`,
        e.x,
        e.y - 43,
        36,
        "#d5e5ce",
      );
  }
  ellipse(c, r.p.x, r.p.y, 26, 26, "#f5da94");
  c.strokeStyle = "#fff1c3";
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(r.p.x, r.p.y);
  c.lineTo(r.p.x + Math.cos(r.p.angle) * 65, r.p.y + Math.sin(r.p.angle) * 65);
  c.stroke();
  c.restore();
}
export function drawBase(canvas: HTMLCanvasElement, time: number) {
  const c = canvas.getContext("2d")!,
    w = canvas.width,
    h = canvas.height;
  c.clearRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#b9c9ae");
  g.addColorStop(0.55, "#9da880");
  g.addColorStop(1, "#879568");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const rand = rng(45);
  for (let i = 0; i < 250; i++) {
    ellipse(c, rand() * w, rand() * h, 1 + rand() * 3, 0.8, "#dfe1b168");
  }
  c.save();
  c.translate(w * 0.49, h * 0.56);
  c.scale(w / 720, w / 720);
  path(
    c,
    [
      [-350, 110],
      [-50, -65],
      [330, 76],
      [0, 260],
    ],
    "#aca57c",
  );
  path(
    c,
    [
      [-300, 140],
      [-40, -2],
      [330, 138],
      [10, 300],
    ],
    "#bcb18c",
  );
  for (let i = -3; i < 5; i++) {
    c.strokeStyle = "#e1d2a344";
    c.beginPath();
    c.moveTo(-280 + i * 75, 120 + i * 15);
    c.lineTo(-35 + i * 75, -10 + i * 15);
    c.stroke();
  }
  box(c, 15, -30, 310, 180, 90, "#9d9c73", "#cad0a8");
  path(
    c,
    [
      [-160, -145],
      [3, -240],
      [185, -145],
      [28, -78],
    ],
    "#465d49",
  );
  path(
    c,
    [
      [3, -240],
      [185, -145],
      [190, -115],
      [23, -202],
    ],
    "#344b3e",
  );
  path(
    c,
    [
      [-160, -145],
      [3, -240],
      [23, -202],
      [-137, -106],
    ],
    "#62765a",
  );
  c.strokeStyle = "#c0c39b5c";
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(-135 + i * 25, -151 - i * 12);
    c.lineTo(18 + i * 25, -88 - i * 12);
    c.stroke();
  }
  round(c, -55, -82, 62, 102, 4, "#384f42");
  round(c, -48, -73, 48, 85, 3, "#203c33");
  round(c, -125, -84, 48, 45, 3, "#475e4f");
  round(c, 69, -85, 58, 42, 3, "#364e40");
  c.fillStyle = "#d6cc8b";
  c.fillRect(-120, -79, 38, 35);
  c.fillRect(75, -79, 46, 30);
  c.strokeStyle = "#607653";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-101, -80);
  c.lineTo(-101, -44);
  c.moveTo(99, -80);
  c.lineTo(99, -49);
  c.stroke();
  box(c, -24, 53, 135, 70, 14, "#777d5b", "#aab18a");
  box(c, -24, 88, 175, 30, 10, "#858866", "#b8bc92");
  round(c, -68, -120, 90, 25, 3, "#d6c28c");
  text(c, "暖 窝 基 地", -23, -102, 14, "#435443");
  tree(c, -260, -45, 1.3);
  tree(c, -210, -150, 1.2);
  tree(c, 230, -120, 1.5);
  tree(c, 285, -20, 1.1);
  box(c, 195, 90, 65, 45, 43, "#899064", "#b8ba8c");
  box(c, 240, 115, 52, 38, 31, "#9b9970", "#cdc493");
  // Cat chief and player share the same articulated art as the battlefield.
  cat(c, -88, 88, {
    player: true,
    fur: "#e9d2ac",
    patch: "#b5854f",
    walk: Math.sin(time) * 0.12,
    angle: 0.35,
    armor: 1,
    helmet: true,
    scale: 1.5,
  });
  cat(c, 80, 105, {
    fur: "#a6aba3",
    patch: "#747e75",
    eye: "#e7cf82",
    angle: 2.7,
    armor: 1,
    scale: 1.2,
  });
  ellipse(c, -210, 140, 55, 28, "#6d9385");
  ellipse(c, -212, 134, 45, 20, "#8fb3a0");
  c.strokeStyle = "#c5dac344";
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(-212, 133, 32 + Math.sin(time) * 2, 11, 0, 0, Math.PI * 2);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const x = -280 + i * 100,
      y = 200 + Math.sin(i) * 15;
    ellipse(c, x, y, 5, 2, "#c5c79a");
  }
  c.restore();
  const v = c.createLinearGradient(0, h * 0.8, 0, h);
  v.addColorStop(0, "#263e3100");
  v.addColorStop(1, "#263e3177");
  c.fillStyle = v;
  c.fillRect(0, 0, w, h);
}
