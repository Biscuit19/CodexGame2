import type { Bullet } from "./raid";
export const projectileColor = (b: Pick<Bullet, "friendly" | "boss">) =>
  b.friendly ? "#ffe6a0" : b.boss ? "#c75aff" : "#ff6033";
/** One proportional trail for both renderers: colored glow, bright core and a readable head. */
export function drawProjectileTrail(
  c: CanvasRenderingContext2D,
  b: Bullet,
  p: { x: number; y: number },
  q: { x: number; y: number },
) {
  const color = projectileColor(b);
  c.save();
  c.lineCap = "round";
  const trail = c.createLinearGradient(q.x, q.y, p.x, p.y);
  trail.addColorStop(0, color + "00");
  trail.addColorStop(0.45, color + "99");
  trail.addColorStop(1, color);
  c.strokeStyle = trail;
  c.lineWidth = b.friendly ? 4 : b.boss ? 8 : 6;
  c.shadowColor = color;
  c.shadowBlur = b.boss ? 17 : 10;
  c.beginPath();
  c.moveTo(q.x, q.y);
  c.lineTo(p.x, p.y);
  c.stroke();
  c.strokeStyle = "#fff6e9";
  c.lineWidth = b.friendly ? 1.3 : 2;
  c.shadowBlur = 0;
  c.beginPath();
  c.moveTo(p.x + (q.x - p.x) * 0.55, p.y + (q.y - p.y) * 0.55);
  c.lineTo(p.x, p.y);
  c.stroke();
  c.fillStyle = b.boss ? "#ffe7ff" : "#fff4d9";
  c.beginPath();
  c.arc(p.x, p.y, b.friendly ? 1.8 : 3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
