import {
  bosses,
  collectibles,
  foods,
  makeItem,
  weapons,
  type Item,
} from "./data";
import type { Raid } from "./raid";

export type VillageBuilding = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  height: number;
  model: string;
  rotation: number;
  entryDepth: number;
  doorY: number;
  doorOffset: number;
  doorWidth: number;
  minor?: boolean;
  flatRoof?: boolean;
  openStructure?: "ruin" | "workshop";
};
export const VILLAGE_WIDTH = 7000,
  VILLAGE_HEIGHT = 5500;
export const villageScale = {
  x: 9000 / 2400,
  y: 6000 / 1800,
};
/** Crop only the western gap, retaining the original central/eastern spacing. */
export function villageX(oldX: number) {
  const x =
    oldX <= 1200
      ? oldX
      : oldX >= 3300
        ? oldX - 1500
        : 1200 + (oldX - 1200) * (600 / 2100);
  if (x <= 1550) return x;
  if (x >= 2800) return x - 500;
  return 1550 + (x - 1550) * 0.6;
}
/** Shorten the southern spawn strip, not the village/farm/Boss regions. */
export function villageY(oldY: number) {
  if (oldY <= 4200) return oldY;
  if (oldY >= 5400) return oldY - 500;
  return 4200 + (oldY - 4200) * (700 / 1200);
}
export const villagePoint = (x: number, y: number) => ({
  x: villageX(x * villageScale.x),
  y: villageY(y * villageScale.y),
});
const designBuildings = [
  {
    id: "hunter",
    name: "猎人小屋",
    x: 260,
    y: 600,
    w: 210,
    h: 160,
    height: 145,
    model: "hunter",
  },
  {
    id: "clinic",
    name: "猫咪诊所",
    x: 1300,
    y: 580,
    w: 230,
    h: 170,
    height: 145,
    model: "clinic",
  },
  {
    id: "shop",
    name: "杂货铺",
    x: 1060,
    y: 1000,
    w: 230,
    h: 170,
    height: 145,
    model: "shop",
  },
  {
    id: "home",
    name: "普通民居",
    x: 1380,
    y: 1110,
    w: 180,
    h: 145,
    height: 135,
    model: "home",
  },
  {
    id: "barn",
    name: "红爪谷仓",
    x: 2060,
    y: 1180,
    w: 300,
    h: 210,
    height: 190,
    model: "barn",
  },
  {
    id: "boss",
    name: "铁腮农庄",
    x: 1940,
    y: 340,
    w: 270,
    h: 200,
    height: 175,
    model: "farmhouse",
  },
];
const rotations = [
  Math.PI / 4,
  -Math.PI / 4,
  0,
  Math.PI / 2,
  Math.PI / 4,
  -Math.PI / 4,
];
// Source walls are x=±2.5, y=±1.5, with a central porch extending to y=-2.5.
// Preserve those proportions instead of stretching a 5×3 house into a giant square.
const buildingWidths = [270, 300, 300, 200, 380, 340];
const buildingDepths = [162, 180, 180, 120, 250, 230];
const verticalWidths = [220, 240, 240, 200, 250, 280];
export const villageBuildings: VillageBuilding[] = designBuildings.map(
  (b, i) => {
    const w = buildingWidths[i],
      h = buildingDepths[i];
    return {
      ...b,
      ...villagePoint(b.x, b.y),
      w,
      h,
      height: (verticalWidths[i] / 5) * (i === 4 ? 4.55 : 6.1) * 0.85,
      flatRoof: i === 4,
      rotation: rotations[i],
      entryDepth: h / 3,
      doorY: h / 2 + h / 3,
      doorOffset: 0,
      doorWidth: w * 0.32,
    };
  },
);
const hunterCamp = villageBuildings[0];
villageBuildings.push({
  ...hunterCamp,
  id: "hunter-side",
  name: "",
  model: "hunter-side",
  x: hunterCamp.x - 470,
  y: hunterCamp.y + 20,
  w: 220,
  h: 132,
  height: (220 / 5) * 6.1 * 0.85,
  rotation: -Math.PI / 4,
  entryDepth: 44,
  doorY: 110,
  doorWidth: 70.4,
  flatRoof: false,
});
for (const [i, position] of [
  [550, 1490],
  [1010, 1685],
  [1300, 1485],
].entries()) {
  const p = villagePoint(position[0], position[1]);
  villageBuildings.push({
    id: `shelter-${i}`,
    name: "",
    model: "shelter",
    x: Math.floor(p.x / 16) * 16 + 8,
    y: Math.floor(p.y / 16) * 16 + 8,
    w: 160,
    h: 96,
    height: (160 / 5) * 6.1 * 0.85,
    rotation: i ? Math.PI / 2 : 0,
    entryDepth: 32,
    doorY: 80,
    doorOffset: 0,
    doorWidth: 51.2,
    minor: true,
  });
}
// Unroofed search sites in previously empty fields, deliberately below major POI scale.
for (const [i, [x, y, kind]] of (
  [
    [1510, 350, "ruin"],
    [1260, 1000, "workshop"],
    [1710, 1180, "ruin"],
    [1800, 1690, "workshop"],
  ] as const
).entries()) {
  villageBuildings.push({
    id: `outbuilding-${i}`,
    name: "",
    model: `open-${kind}`,
    ...villagePoint(x, y),
    w: 300,
    h: 200,
    height: 140,
    rotation: [0, -Math.PI / 4, Math.PI / 4, 0][i],
    entryDepth: 0,
    doorY: 100,
    doorOffset: 0,
    doorWidth: kind === "ruin" ? 180 : 240,
    openStructure: kind,
  });
}
export function buildingLocal(b: VillageBuilding, x: number, y: number) {
  const dx = x - b.x,
    dy = y - b.y,
    c = Math.cos(b.rotation),
    sn = Math.sin(b.rotation);
  return { x: dx * c + dy * sn, y: -dx * sn + dy * c };
}
export function buildingWorld(b: VillageBuilding, x: number, y: number) {
  const c = Math.cos(b.rotation),
    sn = Math.sin(b.rotation);
  return { x: b.x + x * c - y * sn, y: b.y + x * sn + y * c };
}
export function inBuilding(
  b: VillageBuilding,
  x: number,
  y: number,
  margin = 0,
) {
  const p = buildingLocal(b, x, y);
  return (
    (Math.abs(p.x) < b.w / 2 + margin && Math.abs(p.y) < b.h / 2 + margin) ||
    (Math.abs(p.x) < b.w * 0.3 + margin &&
      p.y >= b.h / 2 - margin &&
      p.y < b.doorY + margin)
  );
}
/** Region-local placement expands rooms independently from inter-region distances. */
function regionPoint(region: string, x: number, y: number) {
  const id = region === "boss" ? "boss" : region;
  const base = designBuildings.find((b) => b.id === id),
    b = villageBuildings.find((b) => b.id === id);
  return b && base
    ? buildingWorld(
        b,
        ((x - base.x) * b.w) / base.w,
        ((y - base.y) * b.h) / base.h,
      )
    : villagePoint(x, y);
}
export function hitsRect(
  x: number,
  y: number,
  b: { x: number; y: number; w: number; h: number; rotation?: number },
  padding = 0,
) {
  const c = Math.cos(b.rotation || 0),
    sn = Math.sin(b.rotation || 0),
    dx = x - b.x,
    dy = y - b.y;
  return (
    Math.abs(dx * c + dy * sn) < b.w / 2 + padding &&
    Math.abs(-dx * sn + dy * c) < b.h / 2 + padding
  );
}
export const villageRiver = [
  [-100, 55],
  [280, 100],
  [460, 230],
  [590, 430],
  [650, 650],
  [620, 880],
  [540, 1050],
  [650, 1180],
  [940, 1270],
  [1300, 1330],
  [1770, 1470],
  [2500, 1590],
].map(([x, y]) => {
  const p = villagePoint(x, y);
  return [p.x, p.y];
});
export const villageTributary = [
  [-100, 1000],
  [200, 1040],
  [430, 1100],
  [595, 1110],
].map(([x, y]) => {
  const p = villagePoint(x, y);
  return [p.x, p.y];
});
export const villageWaterWidth = 440;
export const villageBridges = [
  { id: "hunter-entry", x: 260, y: 1050, w: 130, h: 240, rotation: 0 },
  { id: "hunter-link", x: 630, y: 830, w: 240, h: 130, rotation: Math.PI / 2 },
  { id: "main", x: 1460, y: 1376, w: 160, h: 330, rotation: 0 },
].map((b) => ({
  ...b,
  ...villagePoint(b.x, b.y),
  w: b.rotation ? 620 : b.w * 2,
  h: b.rotation ? b.h * 2 : 640,
}));
export const villageRoads: number[][][] = [
  [
    [260, 1530],
    [200, 1370],
    [250, 1180],
    [260, 920],
    [260, 730],
  ],
  [
    [260, 1530],
    [700, 1590],
    [1190, 1600],
    [1460, 1580],
    [1460, 1220],
    [1540, 1220],
    [1580, 1100],
    [1530, 1030],
  ],
  [
    [260, 730],
    [400, 830],
    [630, 830],
    [980, 820],
    [1090, 820],
    [1570, 900],
    [1730, 920],
    [1850, 920],
    [1810, 1020],
    [2010, 1020],
  ],
  [
    [980, 820],
    [950, 500],
    [980, 300],
  ],
  [
    [1090, 820],
    [1300, 750],
    [1450, 700],
    [1620, 740],
    [1950, 680],
    [1960, 600],
  ],
  [
    [980, 820],
    [950, 1040],
    [1000, 1130],
    [1060, 1140],
    [1190, 1200],
    [1240, 1220],
    [1530, 1220],
    [1530, 1030],
    [1570, 900],
  ],
  [
    [1570, 900],
    [1710, 700],
    [1920, 700],
    [2230, 700],
  ],
  [
    [1810, 1020],
    [1800, 1160],
    [1830, 1280],
    [1830, 1340],
    [2060, 1340],
  ],
].map((road) =>
  road.map(([x, y]) => {
    const p = villagePoint(x, y);
    return [p.x, p.y];
  }),
);
const approachAnchors = [
  [260, 730],
  [1450, 700],
  [1060, 1140],
  [1240, 1220],
  [2060, 1340],
  [1960, 600],
];
for (const [i, b] of villageBuildings.slice(0, 6).entries()) {
  const anchor = villagePoint(...(approachAnchors[i] as [number, number])),
    approach = buildingWorld(b, b.doorOffset, b.doorY + 160),
    door = buildingWorld(b, b.doorOffset, b.doorY + 40);
  villageRoads.push([
    [anchor.x, anchor.y],
    [approach.x, approach.y],
    [door.x, door.y],
  ]);
}
export const villagePaths: number[][][] = [];
const sideHut = villageBuildings.find((b) => b.id === "hunter-side")!;
const sideDoor = buildingWorld(sideHut, 0, sideHut.doorY + 40);
villagePaths.push([
  [hunterCamp.x, hunterCamp.y + 300],
  [sideDoor.x, sideDoor.y],
]);
for (const [i, b] of villageBuildings.filter((b) => b.minor).entries()) {
  const door = buildingWorld(b, 0, b.doorY + 120),
    road = villagePoint([700, 1010, 1190][i], [1590, 1600, 1600][i]);
  villagePaths.push([
    [road.x, road.y],
    [door.x, road.y],
    [door.x, door.y],
  ]);
}
export const villageZones = [
  { name: "猎人小屋", x: 250, y: 490 },
  { name: "中央聚落", x: 1060, y: 680 },
  { name: "猫咪诊所", x: 1300, y: 440 },
  { name: "杂货铺", x: 1060, y: 875 },
  { name: "农田", x: 1950, y: 825 },
  { name: "红爪谷仓", x: 2060, y: 1000 },
  { name: "铁腮农庄", x: 1960, y: 170 },
].map((z) => ({ ...z, ...villagePoint(z.x, z.y) }));
export const villageTrees = [
  [100, 250],
  [350, 390],
  [120, 760],
  [450, 660],
  [95, 1430],
  [620, 1630],
  [980, 1690],
  [760, 420],
  [820, 120],
  [1130, 180],
  [1510, 370],
  [1620, 150],
  [2310, 180],
  [2320, 630],
  [1680, 1190],
  [2320, 1300],
  [1810, 1620],
  [2200, 1700],
].map(([x, y]) => {
  const p = villagePoint(x, y);
  return [p.x, p.y];
});
export const villageRocks = [
  [170, 345],
  [430, 850],
  [80, 1290],
  [800, 1550],
  [1090, 360],
  [1560, 600],
  [1640, 1020],
  [2320, 1110],
].map(([x, y]) => {
  const p = villagePoint(x, y);
  return [p.x, p.y];
});
// New sites may occupy former tree/rock locations; never leave an old trunk in a doorway.
for (const points of [villageTrees, villageRocks])
  for (let i = points.length - 1; i >= 0; i--)
    if (
      villageBuildings.some((b) =>
        inBuilding(b, points[i][0], points[i][1], 100),
      )
    )
      points.splice(i, 1);
export function inside(
  x: number,
  y: number,
  b: { x: number; y: number; w: number; h: number },
  padding = 0,
) {
  return (
    Math.abs(x - b.x) <= b.w / 2 - padding &&
    Math.abs(y - b.y) <= b.h / 2 - padding
  );
}
function segmentDistance(x: number, y: number, a: number[], b: number[]) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}
export function villageWaterBlocked(x: number, y: number, r = 15) {
  if (villageBridges.some((b) => inside(x, y, b, r))) return false;
  return [villageRiver, villageTributary].some((points) =>
    points
      .slice(1)
      .some(
        (p, i) =>
          segmentDistance(x, y, points[i], p) < villageWaterWidth / 2 + r,
      ),
  );
}
export function villageTravelClear(
  r: Raid,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 15);
  for (let i = 1; i <= n; i++)
    if (r.blocked(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, 19))
      return false;
  return true;
}
export const villageFenceRects: {
  x: number;
  y: number;
  w: number;
  h: number;
}[] = [
  { x: 1660, y: 395, w: 16, h: 530 },
  { x: 2250, y: 395, w: 16, h: 530 },
  { x: 1955, y: 130, w: 605, h: 16 },
  { x: 1775, y: 660, w: 230, h: 16 },
  { x: 2165, y: 660, w: 170, h: 16 },
  { x: 1770, y: 805, w: 14, h: 110 },
  { x: 1770, y: 1020, w: 14, h: 90 },
  { x: 2090, y: 750, w: 410, h: 14 },
  { x: 2320, y: 900, w: 14, h: 300 },
  { x: 2200, y: 1050, w: 240, h: 14 },
  { x: 1920, y: 1300, w: 140, h: 14 },
  { x: 2220, y: 1300, w: 180, h: 14 },
  { x: 140, y: 775, w: 90, h: 12 },
  { x: 1450, y: 450, w: 130, h: 12 },
].map((f) => ({
  ...f,
  ...villagePoint(f.x, f.y),
  w: f.w > f.h ? f.w * villageScale.x : 18,
  h: f.h > f.w ? f.h * villageScale.y : 18,
}));
export function buildVillage(r: Raid) {
  r.width = VILLAGE_WIDTH;
  r.height = VILLAGE_HEIGHT;
  Object.assign(r.p, villagePoint(260, 1530));
  const add = (
    x: number,
    y: number,
    w: number,
    h: number,
    z: number,
    type: string,
    rotation = 0,
  ) => r.walls.push({ x, y, w, h, z, type, rotation, color: "#837655" });
  r.rooms = villageBuildings.map((b) => [b.x, b.y, b.w, b.h, b.rotation]);
  for (const b of villageBuildings) {
    const wall = (x: number, y: number, w: number, h: number) => {
      const p = buildingWorld(b, x, y);
      add(p.x, p.y, w, h, 95, "village-wall", b.rotation);
    };
    const t = 8,
      wing = b.w * 0.2;
    if (b.openStructure) {
      if (b.openStructure === "ruin") {
        wall(0, -b.h / 2, b.w, t);
        wall(-b.w / 2, 0, t, b.h);
        wall(b.w / 2, 0, t, b.h);
        for (const side of [-1, 1])
          wall(side * b.w * 0.4, b.h / 2, b.w * 0.2, t);
      } else {
        for (const x of [-b.w / 2 + 10, b.w / 2 - 10])
          for (const y of [-b.h / 2 + 10, b.h / 2 - 10]) wall(x, y, 16, 16);
      }
      continue;
    }
    wall(0, -b.h / 2, b.w, t);
    wall(-b.w / 2, 0, t, b.h);
    wall(b.w / 2, 0, t, b.h);
    // Main front wall, porch side walls and actual central doorway match the source mesh.
    for (const side of [-1, 1]) {
      wall(side * b.w * 0.4, b.h / 2, wing, t);
      wall(side * b.w * 0.3, b.h / 2 + b.entryDepth / 2, t, b.entryDepth);
      const jamb = b.w * 0.3 - b.doorWidth / 2;
      wall(side * (b.doorWidth / 2 + jamb / 2), b.doorY, jamb, t);
    }
    // The original single leaf opens 109 degrees outward, clear of the passage.
    const scale = b.w / 5,
      sy = b.h / 3,
      angle = 1.9;
    const leaf = buildingWorld(
      b,
      (-0.81 + 0.81 * Math.cos(angle)) * scale,
      (2.6 + 0.81 * Math.sin(angle)) * sy,
    );
    add(
      leaf.x,
      leaf.y,
      1.62 * Math.hypot(Math.cos(angle) * scale, Math.sin(angle) * sy),
      0.12 * scale,
      90,
      "village-door",
      b.rotation + Math.atan2(Math.sin(angle) * sy, Math.cos(angle) * scale),
    );
  }

  for (const b of villageBridges) {
    if (b.rotation) {
      for (const side of [-1, 1])
        add(
          b.x,
          b.y + side * b.h * 0.4325,
          b.w * 0.995,
          14,
          66,
          "village-bridge-rail",
        );
    } else {
      for (const side of [-1, 1])
        add(
          b.x + side * b.w * 0.4325,
          b.y,
          14,
          b.h * 0.995,
          66,
          "village-bridge-rail",
        );
    }
  }
  for (const f of villageFenceRects)
    add(f.x, f.y, f.w, f.h, 48, "village-fence");
  for (const [x, y] of villageTrees) add(x, y, 28, 28, 80, "village-tree");
  for (const [x, y] of villageRocks) add(x, y, 42, 32, 26, "village-rock");
  for (const p of villageProps)
    if (p.solid)
      add(
        p.x,
        p.y,
        p.w,
        p.d,
        Math.min(90, p.height),
        "village-furniture",
        p.rotation,
      );
  const covers = [
    [180, 700, 65, 35],
    [780, 960, 65, 40],
    [1480, 810, 65, 40],
    [1730, 1150, 70, 45],
    [2130, 920, 60, 45],
    [1730, 575, 70, 40],
    [2200, 480, 70, 40],
    [875, 330, 40, 32],
    [1030, 370, 40, 32],
  ];
  for (const [x, y, w, h] of covers) {
    const p = villagePoint(x, y);
    add(p.x, p.y, w, h, 35, "village-cover");
  }
  const collect = (region: string): Item => {
    const weights: Record<string, number[]> = {
      spawn: [1, 0, 0, 0, 0],
      shelter: [1, 0, 0, 0, 0],
      outbuilding: [0.72, 0.25, 0.03, 0, 0],
      wild: [0.65, 0.29, 0.06, 0, 0],
      farm: [0.54, 0.34, 0.115, 0.005, 0],
      home: [0.55, 0.32, 0.12, 0.01, 0],
      hunter: [0.3, 0.45, 0.23, 0.02, 0],
      shop: [0.35, 0.4, 0.23, 0.02, 0],
      clinic: [0.16, 0.39, 0.41, 0.04, 0],
      barn: [0.06, 0.25, 0.55, 0.1399, 0.0001],
      boss: [0.02, 0.12, 0.56, 0.299, 0.001],
    };
    let roll = r.random(),
      tier = 1;
    const ws = weights[region] || weights.wild;
    for (let i = 0; i < ws.length; i++) {
      roll -= ws[i];
      if (roll < 0) {
        tier = i + 1;
        break;
      }
    }
    const pool = collectibles.filter((c) => c.tier === tier);
    return makeItem(pool[Math.floor(r.random() * pool.length)].id);
  };
  const callIndices: Record<string, number> = {};
  const roomSlots: Record<string, [string, number, number][]> = {
    hunter: [
      ["hunter", -80, -30],
      ["hunter-side", -55, -25],
      ["hunter-side", 55, -25],
      ["hunter", 80, -30],
      ["hunter-side", 0, 50],
      ["hunter", 0, 65],
    ],
    clinic: [
      ["clinic", -105, -50],
      ["clinic", 0, -50],
      ["clinic", 105, -50],
      ["clinic", 205, 120],
      ["clinic", 105, 45],
      ["clinic", 0, 45],
    ],
    shop: [
      ["shop", -105, -50],
      ["shop", 105, -50],
      ["shop", -210, 170],
      ["shop", 210, 170],
      ["shop", -210, 65],
      ["shop", 105, 45],
      ["shop", -105, 45],
    ],
    home: [
      ["home", -60, -30],
      ["home", -160, 110],
      ["home", 60, -30],
      ["home", 155, 70],
    ],
    barn: [
      ["barn", -130, -80],
      ["barn", 130, -80],
      ["barn", -130, 80],
      ["barn", 0, -80],
      ["barn", -260, 190],
      ["barn", 260, 190],
      ["barn", 130, 80],
      ["barn", -130, 0],
    ],
    boss: [
      ["boss", -115, -80],
      ["boss", 115, -80],
      ["boss", -115, 80],
      ["boss", 245, 0],
      ["boss", 115, 80],
      ["boss", -245, 180],
      ["boss", 115, 0],
      ["boss", 220, 230],
    ],
  };
  const container = (
    region: string,
    type: string,
    x: number,
    y: number,
    chance = 1,
  ) => {
    const callIndex = callIndices[region] || 0;
    callIndices[region] = callIndex + 1;
    if (r.random() > chance) return;
    const high = ["safe", "weapon", "bed"].includes(type),
      count = high ? 3 : 2;
    const items: Item[] = [];
    for (let i = 0; i < count; i++) {
      const n = r.random();
      if ((region === "clinic" && n < 0.7) || (type === "medical" && i === 0)) {
        const pool = foods.filter((f) => f.tier <= 3);
        items.push(makeItem(pool[Math.floor(r.random() * pool.length)].id));
      } else if (type === "weapon" && i === 0) {
        const pool = weapons.filter(
          (w) => w.tier <= (region === "boss" ? 4 : region === "barn" ? 3 : 2),
        );
        items.push(makeItem(pool[Math.floor(r.random() * pool.length)].id));
      } else if (
        region !== "clinic" &&
        n < (region === "hunter" ? 0.45 : region === "boss" ? 0.35 : 0.15)
      ) {
        const tier =
          region === "boss"
            ? 2 + Math.floor(r.random() * 3)
            : region === "barn"
              ? 1 + Math.floor(r.random() * 3)
              : 1;
        items.push(makeItem(`m${tier}`, 25 + Math.floor(r.random() * 26)));
      } else if (
        region !== "spawn" &&
        region !== "shelter" &&
        region !== "outbuilding" &&
        region !== "clinic" &&
        n > 0.88
      ) {
        items.push(
          makeItem(`a${region === "boss" ? 3 : region === "barn" ? 2 : 1}`),
        );
      } else if ((region === "shop" || region === "wild") && n < 0.45)
        items.push(makeItem(foods[Math.floor(r.random() * 3)].id));
      else items.push(collect(region));
    }
    const names: Record<string, string> = {
      box: "纸箱",
      litter: "猫砂桶",
      cabinet: "工具柜",
      medical: "医疗箱",
      weapon: "武器箱",
      bed: "豪华猫窝",
      safe: "保险箱",
    };
    const slot = roomSlots[region]?.[callIndex];
    const location = slot
      ? buildingWorld(
          villageBuildings.find((b) => b.id === slot[0])!,
          slot[1],
          slot[2],
        )
      : regionPoint(region, x, y);
    r.containers.push({
      x: location.x,
      y: location.y,
      type,
      name: names[type],
      items,
      revealed: 0,
      open: false,
      locked: type === "safe",
      cooldown: 0,
      region,
    });
  };
  container("spawn", "box", 200, 1570);
  container("spawn", "litter", 390, 1500);
  container("hunter", "box", 200, 570);
  container("hunter", "box", 315, 720);
  container("hunter", "litter", 380, 650);
  container("hunter", "cabinet", 315, 560);
  container("hunter", "cabinet", 200, 640);
  container("hunter", "weapon", 265, 605, 0.5);
  container("wild", "box", 810, 860);
  container("wild", "litter", 900, 520);
  container("wild", "box", 1120, 780);
  container("wild", "box", 1450, 790);
  container("wild", "cabinet", 1220, 900, 0.4);
  container("wild", "box", 1490, 1180);
  container("clinic", "medical", 1235, 540);
  container("clinic", "medical", 1360, 545);
  container("clinic", "medical", 1240, 615);
  container("clinic", "box", 1370, 695);
  container("clinic", "cabinet", 1360, 610);
  container("clinic", "bed", 1300, 580, 0.25);
  container("shop", "box", 1000, 965);
  container("shop", "box", 1110, 965);
  container("shop", "box", 965, 1120);
  container("shop", "litter", 1160, 1125);
  container("shop", "litter", 955, 1040);
  container("shop", "cabinet", 1110, 1035);
  container("shop", "bed", 1055, 1000, 0.2);
  container("home", "box", 1330, 1080);
  container("home", "box", 1420, 1220);
  container("home", "litter", 1430, 1130);
  container("home", "cabinet", 1380, 1100, 0.2);
  container("farm", "box", 1850, 810);
  container("farm", "box", 2160, 960);
  container("farm", "box", 2220, 840);
  container("farm", "litter", 1820, 970);
  container("farm", "litter", 2290, 990);
  container("farm", "cabinet", 2240, 785, 0.4);
  container("barn", "cabinet", 1950, 1140);
  container("barn", "cabinet", 2140, 1150);
  container("barn", "weapon", 1980, 1220);
  container("barn", "weapon", 2140, 1220, 0.6);
  container("barn", "box", 1910, 1340);
  container("barn", "box", 2200, 1330);
  container("barn", "bed", 2070, 1150);
  container("barn", "safe", 2070, 1220, 0.35);
  container("boss", "weapon", 1840, 300);
  container("boss", "weapon", 2010, 300);
  container("boss", "cabinet", 1850, 380);
  container("boss", "cabinet", 2180, 330);
  container("boss", "bed", 1940, 300);
  container("boss", "bed", 1800, 550, 0.5);
  container("boss", "safe", 2010, 380);
  container("boss", "box", 2140, 580);
  for (const c of r.containers) Object.assign(c, r.freePoint(c.x, c.y));
  const enemy = (
    x: number,
    y: number,
    breed: number,
    tier: number,
    squad: string,
  ) => {
    const p = regionPoint(squad.startsWith("boss") ? "boss" : squad, x, y);
    const e = r.spawn(p.x, p.y, breed, tier);
    e.squad = squad;
    if (squad.startsWith("boss"))
      e.leash = {
        ...villagePoint(1955, 400),
        w: 550 * villageScale.x,
        h: 470 * villageScale.y,
      };
    return e;
  };
  enemy(265, 640, 0, 1, "hunter");
  enemy(400, 750, 2, 1, "hunter");
  if (r.random() < 0.3) enemy(150, 510, 3, 1, "hunter");
  enemy(1300, 610, 2, 1, "clinic");
  enemy(1440, 690, 3, 2, "clinic");
  enemy(1060, 1040, 0, 1, "shop");
  enemy(1180, 1150, 3, 1, "shop");
  enemy(1390, 1140, 2, 1, "home");
  enemy(1040, 570, 0, 1, "village");
  enemy(1840, 860, 0, 1, "farm");
  enemy(2030, 880, 2, 1, "farm");
  enemy(2240, 1000, 3, 1, "farm");
  enemy(1960, 1180, 3, 2, "barn");
  enemy(2120, 1180, 11, 2, "barn");
  enemy(1880, 1260, 2, 1, "barn");
  enemy(2210, 1120, 3, 2, "barn");
  enemy(1740, 520, 2, 2, "boss-west");
  enemy(2180, 580, 3, 2, "boss-east");
  enemy(1850, 360, 11, 2, "boss-inner");
  enemy(2020, 360, 3, 2, "boss-inner");
  const bossLocation = regionPoint("boss", 1940, 380);
  const boss = r.spawn(
    bossLocation.x,
    bossLocation.y,
    bosses[0].breed,
    2,
    bosses[0],
  );
  boss.squad = "boss-inner";
  boss.leash = {
    ...villagePoint(1955, 400),
    w: 550 * villageScale.x,
    h: 470 * villageScale.y,
  };
  if (r.random() < 0.2) enemy(1540, 1160, 0, 1, "bridge");
  r.exits = [
    {
      ...villagePoint(1580, 940),
      name: "田间岔路 A",
      paid: false,
      active: true,
      bought: false,
    },
    {
      ...villagePoint(2140, 500),
      name: "农庄内院 B",
      paid: false,
      active: r.random() > 0.5,
      bought: false,
    },
    {
      ...villagePoint(950, 300),
      name: "乡间运输点",
      paid: true,
      active: true,
      bought: false,
    },
  ];
  for (const b of villageBuildings.filter((b) => b.minor)) {
    container("shelter", "box", 0, 0);
    Object.assign(
      r.containers[r.containers.length - 1],
      buildingWorld(b, 0, -18),
    );
  }
  for (const b of villageBuildings.filter((b) => b.openStructure)) {
    for (const x of [-70, 70]) {
      container("outbuilding", "box", 0, 0);
      Object.assign(
        r.containers[r.containers.length - 1],
        buildingWorld(b, x, -35),
      );
    }
  }
}

export type VillageProp = {
  model: string;
  x: number;
  y: number;
  w: number;
  d: number;
  height: number;
  rotation: number;
  solid?: boolean;
  buildingId?: string;
};
export const villageProps: VillageProp[] = [];
function outside(
  model: string,
  x: number,
  y: number,
  w: number,
  d: number,
  height: number,
  rotation = 0,
  solid = true,
) {
  villageProps.push({
    model,
    ...villagePoint(x, y),
    w,
    d,
    height,
    rotation,
    solid,
  });
}
function furnishing(
  id: string,
  model: string,
  x: number,
  y: number,
  w: number,
  d: number,
  height: number,
  rotation = 0,
  solid = true,
) {
  const b = villageBuildings.find((b) => b.id === id)!;
  villageProps.push({
    model,
    ...buildingWorld(b, x, y),
    w,
    d,
    height,
    rotation: b.rotation + rotation,
    solid,
    buildingId: id,
  });
}
outside("well", 1070, 610, 115, 100, 140);
outside("bench", 110, 690, 90, 35, 45, Math.PI);
outside("bench", 1120, 675, 90, 35, 45, Math.PI + 0.15);
outside("lantern", 1430, 780, 32, 32, 145, 0, false);
outside("lantern", 1900, 1070, 32, 32, 145, 0, false);
outside("table", 1280, 1060, 100, 70, 48);
outside("chair", 1255, 1060, 32, 34, 50, -Math.PI / 2);
outside("chair", 1305, 1060, 32, 34, 50, Math.PI / 2);
outside("blanket", 900, 1660, 115, 90, 2, 0, false);
outside("basket", 914, 1660, 35, 27, 30, 0.3, false);
outside("blanket", 1980, 1080, 110, 85, 2, 0.2, false);
outside("basket", 1995, 1080, 35, 27, 30, 0, false);
outside("cabinet", 2260, 1120, 65, 30, 60, 0.4);
for (const id of ["hunter", "clinic", "shop", "home"]) {
  const b = villageBuildings.find((b) => b.id === id)!,
    p = buildingWorld(b, -b.w / 2 - 50, b.doorY + 10);
  villageProps.push({
    model: "mailbox",
    ...p,
    w: 28,
    d: 30,
    height: 55,
    rotation: b.rotation,
    solid: false,
  });
}
furnishing("hunter", "bed", -85, 42, 64, 38, 34);
furnishing("clinic", "desk", -110, 35, 60, 30, 42);
furnishing("shop", "fridge", -125, 0, 38, 35, 75);
furnishing("home", "desk", -65, 28, 48, 26, 38);
furnishing("barn", "bed", 140, 0, 65, 38, 34, Math.PI / 2);
furnishing("boss", "desk", -120, 0, 70, 32, 42);
furnishing("boss", "chair", -77, 0, 28, 28, 45, -Math.PI / 2);
// New source-model vignettes: grouped by purpose, with broad gaps for sightlines.
const fieldProps: [
  string,
  number,
  number,
  number,
  number,
  number,
  number?,
  boolean?,
][] = [
  ["fountain", 1210, 480, 95, 95, 68],
  ["trashcan", 1130, 650, 28, 28, 46],
  ["cobblestones", 1090, 640, 90, 65, 3, 0, false],
  ["bird", 1110, 620, 16, 22, 19, 1, false],
  ["cooler", 905, 1660, 42, 32, 32],
  ["radio", 885, 1660, 27, 16, 24, 0, false],
  ["sacks", 1870, 1130, 65, 50, 48],
  ["pallet", 1930, 1130, 90, 70, 13],
  ["water-bucket", 1990, 1100, 30, 30, 30, 0, false],
  ["target", 160, 560, 60, 35, 85],
  ["sacks", 1480, 390, 65, 50, 48],
  ["pallet", 1545, 440, 85, 65, 13],
  ["water-bucket", 1480, 485, 30, 30, 30, 0, false],
  ["pallet", 1070, 1150, 85, 65, 13],
  ["sacks", 1090, 1100, 65, 50, 48],
  ["trashcan", 1140, 1215, 28, 28, 46],
  ["pallet", 1745, 1120, 85, 65, 13],
  ["water-bucket", 1660, 1220, 30, 30, 30, 0, false],
  ["sacks", 1770, 1740, 65, 50, 48],
  ["cooler", 1840, 1740, 42, 32, 32],
  ["bird", 1450, 210, 16, 22, 19, 2, false],
  ["bird", 2180, 1410, 16, 22, 19, -1, false],
  ["cobblestones", 2020, 1530, 90, 65, 3, 1, false],
  ["trashcan", 1330, 1510, 28, 28, 46],
  ["water-bucket", 510, 1440, 30, 30, 30, 0, false],
  ["pallet", 660, 1590, 85, 65, 13],
  ["sacks", 790, 1690, 65, 50, 48],
  ["bird", 820, 1480, 16, 22, 19, 2, false],
  ["trashcan", 2100, 1650, 28, 28, 46],
];
for (const [
  model,
  x,
  y,
  w,
  d,
  height,
  rotation = 0,
  solid = true,
] of fieldProps) {
  const origin = villagePoint(x, y);
  let placed = false;
  for (const radius of [0, 100, 180, 260]) {
    for (let n = 0; n < (radius ? 8 : 1); n++) {
      const px = origin.x + Math.cos((n * Math.PI) / 4) * radius,
        py = origin.y + Math.sin((n * Math.PI) / 4) * radius,
        margin = Math.max(w, d) / 2 + 20;
      if (
        px < 80 ||
        px > VILLAGE_WIDTH - 80 ||
        py < 80 ||
        py > VILLAGE_HEIGHT - 80 ||
        villageWaterBlocked(px, py, margin) ||
        villageBuildings.some((b) => {
          const local = buildingLocal(b, px, py);
          return (
            inBuilding(b, px, py, margin) ||
            (Math.abs(local.x) < 70 + margin &&
              local.y > b.h / 2 &&
              local.y < b.doorY + 180)
          );
        }) ||
        villageProps.some((p) => hitsRect(px, py, { ...p, h: p.d }, margin)) ||
        villageBridges.some((b) => inside(px, py, b, -margin)) ||
        (solid &&
          [...villageRoads, ...villagePaths].some((road) =>
            road
              .slice(1)
              .some((q, i) => segmentDistance(px, py, road[i], q) < 135),
          ))
      )
        continue;
      villageProps.push({ model, x: px, y: py, w, d, height, rotation, solid });
      placed = true;
      break;
    }
    if (placed) break;
  }
}
export type VillageDecoration = {
  kind: "bush" | "grass" | "flower" | "flower-white" | "hay";
  x: number;
  y: number;
  size: number;
  angle: number;
};
export const villageDecorations: VillageDecoration[] = [];
function decorationFree(x: number, y: number, margin = 80) {
  return (
    x > 100 &&
    x < VILLAGE_WIDTH - 100 &&
    y > 100 &&
    y < VILLAGE_HEIGHT - 100 &&
    !villageWaterBlocked(x, y, margin) &&
    !villageBuildings.some((b) => inBuilding(b, x, y, margin + 100)) &&
    !villageProps.some((p) => hitsRect(x, y, { ...p, h: p.d }, margin)) &&
    !villageBridges.some((b) => inside(x, y, b, -margin))
  );
}
let decorationSeed = 9017;
const decorationRandom = () => {
  decorationSeed = (Math.imul(decorationSeed, 1664525) + 1013904223) >>> 0;
  return decorationSeed / 4294967296;
};
// Small groups, separated by long open stretches. Never use raid RNG: loot stays identical.
for (let i = 0; i < 135; i++) {
  const x = villageX(180 + decorationRandom() * (9000 - 360)),
    y = villageY(180 + decorationRandom() * (6000 - 360));
  if (
    decorationFree(x, y, 100) &&
    ![...villageRoads, ...villagePaths].some((road) =>
      road.slice(1).some((p, n) => segmentDistance(x, y, road[n], p) < 190),
    ) &&
    !villageTrees.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < 200)
  )
    villageTrees.push([x, y]);
}
for (let i = 0; i < 65; i++) {
  const x = villageX(170 + decorationRandom() * (9000 - 340)),
    y = villageY(170 + decorationRandom() * (6000 - 340));
  if (
    decorationFree(x, y, 55) &&
    ![...villageRoads, ...villagePaths].some((road) =>
      road.slice(1).some((p, n) => segmentDistance(x, y, road[n], p) < 130),
    )
  )
    villageRocks.push([x, y]);
}
for (const [r, road] of villageRoads.entries())
  for (let n = 1; n < road.length; n++) {
    const a = road[n - 1],
      b = road[n],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let d = 150; d < length - 80; d += 250) {
      const side = (r + n + Math.floor(d / 250)) % 2 ? 1 : -1;
      const x =
          a[0] +
          ((b[0] - a[0]) * d) / length -
          ((b[1] - a[1]) / length) * side * 145,
        y =
          a[1] +
          ((b[1] - a[1]) * d) / length +
          ((b[0] - a[0]) / length) * side * 145;
      if (!decorationFree(x, y, 35)) continue;
      const kinds = [
        "grass",
        "flower",
        "grass",
        "bush",
        "flower-white",
      ] as const;
      villageDecorations.push({
        kind: kinds[(n + r + Math.floor(d / 250)) % 5],
        x,
        y,
        size: 32 + (n % 3) * 9,
        angle: r + n,
      });
      if (decorationFree(x + side * 37, y + 27, 35))
        villageDecorations.push({
          kind: "grass",
          x: x + side * 37,
          y: y + 27,
          size: 23,
          angle: r,
        });
    }
  }
// A few field bundles, not a dense collection of props.
for (const [x, y] of [
  [1850, 815],
  [1980, 945],
  [2200, 1030],
  [2210, 1280],
  [2010, 1320],
]) {
  const p = villagePoint(x, y);
  villageDecorations.push({ kind: "hay", ...p, size: 70, angle: x * 0.01 });
}
