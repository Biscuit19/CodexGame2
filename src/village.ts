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
  doorOffset: number;
  doorWidth: number;
};
export const VILLAGE_WIDTH = 13000,
  VILLAGE_HEIGHT = 10000;
export const villageScale = {
  x: VILLAGE_WIDTH / 2400,
  y: VILLAGE_HEIGHT / 1800,
};
export const villagePoint = (x: number, y: number) => ({
  x: x * villageScale.x,
  y: y * villageScale.y,
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
export const villageBuildings: VillageBuilding[] = designBuildings.map(
  (b, i) => ({
    ...b,
    ...villagePoint(b.x, b.y),
    w: b.w * 4,
    h: b.h * 4,
    height: [420, 440, 420, 380, 540, 500][i],
    rotation: rotations[i],
    doorOffset: b.w * 4 * 0.162,
    doorWidth: b.w * 4 * 0.32,
  }),
);
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
  return Math.abs(p.x) < b.w / 2 + margin && Math.abs(p.y) < b.h / 2 + margin;
}
/** Region-local placement expands rooms independently from inter-region distances. */
function regionPoint(region: string, x: number, y: number) {
  const id = region === "boss" ? "boss" : region;
  const base = designBuildings.find((b) => b.id === id),
    b = villageBuildings.find((b) => b.id === id);
  return b && base
    ? buildingWorld(b, (x - base.x) * 4, (y - base.y) * 4)
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
].map(([x, y]) => [x * villageScale.x, y * villageScale.y]);
export const villageTributary = [
  [-100, 1000],
  [200, 1040],
  [430, 1100],
  [595, 1110],
].map(([x, y]) => [x * villageScale.x, y * villageScale.y]);
export const villageWaterWidth = 650;
export const villageBridges = [
  { id: "hunter-entry", x: 260, y: 1050, w: 130, h: 240, rotation: 0 },
  { id: "hunter-link", x: 630, y: 830, w: 240, h: 130, rotation: Math.PI / 2 },
  { id: "main", x: 1460, y: 1360, w: 160, h: 330, rotation: 0 },
].map((b) => ({
  ...b,
  ...villagePoint(b.x, b.y),
  w: b.rotation ? b.w * villageScale.x : b.w * 3,
  h: b.rotation ? b.h * 3 : b.id === "main" ? 1300 : b.h * villageScale.y,
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
    [1460, 1540],
    [1460, 1220],
    [1540, 1220],
    [1580, 1100],
    [1530, 1030],
  ],
  [
    [260, 730],
    [400, 810],
    [630, 830],
    [850, 820],
    [1090, 820],
    [1570, 900],
    [1730, 920],
    [1850, 920],
    [1810, 1020],
    [2010, 1020],
  ],
  [
    [850, 820],
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
    [850, 820],
    [870, 1040],
    [900, 1130],
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
].map((road) => road.map(([x, y]) => [x * villageScale.x, y * villageScale.y]));
const approachAnchors = [
  [260, 730],
  [1450, 700],
  [1060, 1140],
  [1240, 1220],
  [2060, 1340],
  [1960, 600],
];
for (const [i, b] of villageBuildings.entries()) {
  const anchor = villagePoint(...(approachAnchors[i] as [number, number])),
    approach = buildingWorld(
      b,
      b.doorOffset,
      b.h / 2 + (b.id === "barn" ? 200 : 300),
    ),
    door = buildingWorld(b, b.doorOffset, b.h / 2 + 40);
  villageRoads.push([
    [anchor.x, anchor.y],
    [approach.x, approach.y],
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
].map(([x, y]) => [x * villageScale.x, y * villageScale.y]);
export const villageRocks = [
  [170, 345],
  [430, 850],
  [80, 1290],
  [800, 1550],
  [1090, 360],
  [1560, 600],
  [1640, 1020],
  [2320, 1110],
].map(([x, y]) => [x * villageScale.x, y * villageScale.y]);
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
    wall(0, -b.h / 2, b.w, 20);
    wall(-b.w / 2, 0, 20, b.h);
    wall(b.w / 2, 0, 20, b.h);
    const left = b.w / 2 + b.doorOffset - b.doorWidth / 2,
      right = b.w / 2 - b.doorOffset - b.doorWidth / 2;
    wall(-b.w / 2 + left / 2, b.h / 2, left, 20);
    wall(b.w / 2 - right / 2, b.h / 2, right, 20);
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
  const container = (
    region: string,
    type: string,
    x: number,
    y: number,
    chance = 1,
  ) => {
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
      } else if (region !== "spawn" && region !== "clinic" && n > 0.88) {
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
    const location = regionPoint(region, x, y);
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
  container("hunter", "cabinet", 200, 635);
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
}

for (let i = 0; i < 70; i++) {
  const x = 350 + ((i * 1877) % 12200),
    y = 350 + ((i * 2437) % 9200);
  if (
    !villageWaterBlocked(x, y, 100) &&
    !villageBuildings.some((b) => inBuilding(b, x, y, 650)) &&
    !villageRoads.some((road) =>
      road.slice(1).some((p, n) => segmentDistance(x, y, road[n], p) < 330),
    )
  )
    villageTrees.push([x, y]);
}
