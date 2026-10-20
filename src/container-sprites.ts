import atlasURL from "./assets/village/container-atlas.png?url";
import {
  containerKinds,
  containerKind,
  highValueContainer,
  CONTAINER_HIGHLIGHT_RANGE,
} from "./container-info";
import type { Container, Raid } from "./raid";
const atlas = new Image();
atlas.src = atlasURL;
const silhouettes = new Map<string, HTMLCanvasElement>();
export function drawContainerSprite(
  ctx: CanvasRenderingContext2D,
  c: Container,
  r: Raid,
) {
  if (!atlas.complete || !atlas.naturalWidth) return false;
  const column = containerKinds.indexOf(
      containerKind(c) as (typeof containerKinds)[number],
    ),
    row = c.open ? 1 : 0;
  const x = c.x - 50,
    y = c.y - 67;
  if (
    Math.hypot(c.x - r.p.x, c.y - r.p.y) < CONTAINER_HIGHLIGHT_RANGE &&
    r.lineClear(r.p.x, r.p.y, c.x, c.y)
  ) {
    const color = highValueContainer(c) ? "#ffe044" : "#f7fbff";
    if (!silhouettes.has(color)) {
      const canvas = document.createElement("canvas");
      canvas.width = atlas.width;
      canvas.height = atlas.height;
      const paint = canvas.getContext("2d")!;
      paint.drawImage(atlas, 0, 0);
      paint.globalCompositeOperation = "source-in";
      paint.fillStyle = color;
      paint.fillRect(0, 0, canvas.width, canvas.height);
      silhouettes.set(color, canvas);
    }
    for (let n = 0; n < 8; n++)
      ctx.drawImage(
        silhouettes.get(color)!,
        column * 256,
        row * 256,
        256,
        256,
        x + Math.cos((n * Math.PI) / 4) * (highValueContainer(c) ? 2.6 : 1.3),
        y + Math.sin((n * Math.PI) / 4) * (highValueContainer(c) ? 2.6 : 1.3),
        100,
        100,
      );
  }
  ctx.drawImage(atlas, column * 256, row * 256, 256, 256, x, y, 100, 100);
  return true;
}
