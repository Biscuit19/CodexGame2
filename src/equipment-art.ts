import weaponsUrl from "./assets/icons/weapons.png";
import equipmentUrl from "./assets/icons/equipment.png";
import { iconFrames } from "./icon-frames";
import collectible0 from "./assets/icons/collectibles-0.png";
import collectible1 from "./assets/icons/collectibles-1.png";
import collectible2 from "./assets/icons/collectibles-2.png";
import { collectibleFrames } from "./collectible-frames";
import collectible3 from "./assets/icons/collectibles-3.png";
import { extraCollectibleFrames } from "./extra-collectible-frames";
import householdUrl from "./assets/icons/collectibles-household.png";
import { householdFrames } from "./household-frames";

// Generated PNG atlases: exact row-major order, one complete icon in each cell.
export function equipmentFrame(id: string) {
  if (Object.hasOwn(householdFrames.frames, id))
    return {
      url: householdUrl,
      width: householdFrames.width,
      height: householdFrames.height,
      rect: householdFrames.frames[id as keyof typeof householdFrames.frames],
    };
  if (id === "unknown" || (/^c5_(\d+)$/.test(id) && Number(id.slice(3)) < 15)) {
    return {
      url: collectible3,
      ...extraCollectibleFrames,
      rect: extraCollectibleFrames.frames[
        id === "unknown" ? 15 : Number(id.slice(3))
      ],
    };
  }
  const collectible = /^c([0-4])_(\d+)$/.exec(id);
  if (collectible && Number(collectible[2]) < 12) {
    const index = Number(collectible[1]) * 12 + Number(collectible[2]),
      atlas = Math.floor(index / 20);
    return {
      url: [collectible0, collectible1, collectible2][atlas],
      ...collectibleFrames[atlas],
      rect: collectibleFrames[atlas].frames[index % 20],
    };
  }
  if (/^w\d+$/.test(id) && Number(id.slice(1)) < 20)
    return {
      url: weaponsUrl,
      ...iconFrames.weapons,
      rect: iconFrames.weapons.frames[Number(id.slice(1))],
    };
  const index = /^a[1-5]$/.test(id)
    ? Number(id[1]) - 1
    : /^h[1-5]$/.test(id)
      ? Number(id[1]) + 4
      : /^b[1-5]$/.test(id)
        ? Number(id[1]) + 9
        : id === "k0"
          ? 15
          : /^m[1-4]$/.test(id)
            ? Number(id[1]) + 15
            : /^f[1-4]$/.test(id)
              ? Number(id[1]) + 19
              : -1;
  return index < 0
    ? undefined
    : {
        url: equipmentUrl,
        ...iconFrames.equipment,
        rect: iconFrames.equipment.frames[index],
      };
}
export function equipmentSprite(id: string, size: number) {
  const f = equipmentFrame(id);
  if (!f) return undefined;
  const [x, y, w, h] = f.rect,
    ratio = w / h;
  return `<span class="item-art" aria-hidden="true" data-art="${id}" style="--art-size:${size}px"><span class="art-glyph" style="width:min(var(--art-w),calc(var(--art-h) * ${ratio}));height:min(var(--art-h),calc(var(--art-w) / ${ratio}));background-image:url('${f.url}');background-size:${(f.width / w) * 100}% ${(f.height / h) * 100}%;background-position:${(x / (f.width - w)) * 100}% ${(y / (f.height - h)) * 100}%"></span></span>`;
}
const images = new Map<string, HTMLImageElement>();
export function drawEquipment(
  ctx: CanvasRenderingContext2D,
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const f = equipmentFrame(id);
  if (!f) return false;
  let img = images.get(f.url);
  if (!img) {
    img = new Image();
    img.src = f.url;
    images.set(f.url, img);
  }
  if (!img.complete || !img.naturalWidth) return false;
  const [sx, sy, sw, sh] = f.rect;
  const scale = Math.min(w / sw, h / sh),
    dw = sw * scale,
    dh = sh * scale;
  ctx.drawImage(
    img,
    sx,
    sy,
    sw,
    sh,
    x + (w - dw) / 2,
    y + (h - dh) / 2,
    dw,
    dh,
  );
  return true;
}
export const weaponPalette: [string, string][] = [
  ["#25bcb1", "#f58a35"],
  ["#9270cd", "#f3aac6"],
  ["#a63743", "#8dcbb1"],
  ["#315c66", "#f58a35"],
  ["#75c6a4", "#f3dea3"],
  ["#296858", "#efb84c"],
  ["#4c97d4", "#f3dea3"],
  ["#e4b13d", "#ed92ae"],
  ["#e77865", "#9bd9c2"],
  ["#70b5e1", "#f3dea3"],
  ["#9b5d3e", "#91cbb2"],
  ["#a93049", "#e9b548"],
  ["#35b5b5", "#f3dea3"],
  ["#9472ca", "#ec9ab4"],
  ["#9482cd", "#f3dea3"],
  ["#b34689", "#f4aabb"],
  ["#71c7a2", "#dca661"],
  ["#a44843", "#f3dea3"],
  ["#9a3944", "#e3b33d"],
  ["#3c4c8c", "#b185e0"],
];
