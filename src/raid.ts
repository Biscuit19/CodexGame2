import {
  db,
  makeItem,
  weapons,
  breeds,
  bosses,
  maps,
  loot,
  rng,
  damage,
  searchTime,
  mathQuestion,
  colors,
  armorDur,
  helmetDur,
  protection,
  AMMO_STACK,
  BASE_PACK,
  EXTRACT_SECONDS,
  MOVEMENT,
  MELEE_SWING_SECONDS,
  melee,
  wearWeapon,
  weaponDamageScale,
  randomWeapon,
  sale,
  takeQuantity,
  foods,
  type Item,
  type BossDef,
} from "./data";
import {
  type Save,
  type Result,
  persist,
  packCapacity,
  canPut,
  put,
  beginRaid,
  cancelRaid,
  equip,
  settle,
  normalizeAmmo,
  swapWeaponSlots,
  selectAmmo,
  refillAmmo,
} from "./store";
import { Sound } from "./audio";
import {
  buildVillage,
  villageWaterBlocked,
  villageTravelClear,
  hitsRect,
} from "./village";
import { routeVillage } from "./navigation";
export interface Rect {
  rotation?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  color: string;
  label?: string;
  type?: string;
}
export interface Enemy {
  squad?: string;
  leash?: { x: number; y: number; w: number; h: number };
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  tier: number;
  armorDurability: number;
  helmetDurability: number;
  breed: number;
  angle: number;
  walk: number;
  cool: number;
  skillCool: number;
  state: string;
  alert: number;
  hit: number;
  boss?: BossDef;
  id: string;
  weapon: number;
  weaponDurability: number;
  mag: number;
  reload: number;
  phase: number;
  shield: number;
  target?: { x: number; y: number };
  path?: { x: number; y: number }[];
  pathTime: number;
  telegraph?: { x: number; y: number; time: number };
  turret?: boolean;
}
export interface Container {
  region?: string;
  bossLoot?: boolean;
  x: number;
  y: number;
  name: string;
  type: string;
  items: Item[];
  revealed: number;
  open: boolean;
  locked: boolean;
  cooldown: number;
}
export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  friendly: boolean;
  damage: number;
  tier: number;
  range: number;
  travel: number;
  shotgun?: boolean;
}
export const projectileFalloff = (b: Bullet) =>
  b.shotgun
    ? Math.max(
        0.15,
        Math.min(
          1,
          1 - (Math.max(0, b.travel - 50) / Math.max(1, b.range - 50)) * 0.85,
        ),
      )
    : Math.max(0.45, 1 - (b.travel / b.range) * 0.3);
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}
export interface Floating {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}
export interface Exit {
  x: number;
  y: number;
  name: string;
  paid: boolean;
  active: boolean;
  bought: boolean;
}
export class Raid {
  width = 2400;
  height = 1800;
  map: number;
  save: Save;
  sound: Sound;
  seed: number;
  random: () => number;
  p = {
    x: 260,
    y: 1450,
    hp: 100,
    stamina: MOVEMENT.maxStamina,
    angle: 0,
    walk: 0,
    moveAngle: 0,
    roll: 0,
    rollCooldown: 0,
    rollX: 0,
    rollY: 0,
    rollAim: 0,
    exhausted: false,
    hit: 0,
  };
  enemies: Enemy[] = [];
  containers: Container[] = [];
  walls: Rect[] = [];
  rooms: number[][] = [];
  exits: Exit[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  /** Transient map-one paw marks: simulation time freezes their fade while paused. */
  footprints: { x: number; y: number; angle: number; life: number }[] = [];
  private footstepDistance = 0;
  private footstepSide = 1;
  combatFX: {
    kind: "muzzle" | "hit" | "melee";
    x: number;
    y: number;
    angle: number;
    friendly: boolean;
    life: number;
    max: number;
  }[] = [];
  floating: Floating[] = [];
  time = 900;
  elapsed = 0;
  paused = false;
  done = false;
  activeWeapon: "primary" | "secondary" | "melee" = "primary";
  magazines: Record<string, number> = {};
  magazineTiers: Record<string, number> = {};
  ammoTier = 1;
  reload = 0;
  fireCool = 0;
  heal = 0;
  healItem = "";
  healSource?: Container;
  meleeCooldown = 0;
  meleeSwing = 0;
  healDuration = 0;
  regeneration = { remaining: 0, rate: 0 };
  extract = 0;
  exit?: Exit;
  search?: Container;
  searchProgress = 0;
  puzzle?: ReturnType<typeof mathQuestion>;
  puzzleContainer?: Container;
  stats = { kills: 0, searches: 0, damageDealt: 0, damageTaken: 0 };
  pendingBosses: string[] = [];
  value = 0;
  shake = 0;
  warning = false;
  near?: Container | Exit;
  inventory = false;
  mapOpen = false;
  onChange: () => void;
  onEnd: (r: Result) => void;
  notify: (s: string) => void;
  onDiscover?: (item: Item) => void;
  tick = 0;
  checkpoint = 0;
  constructor(
    save: Save,
    map: number,
    sound: Sound,
    onChange: () => void,
    onEnd: (r: Result) => void,
    notify: (s: string) => void,
    seed = Date.now() >>> 0,
  ) {
    this.save = save;
    this.map = map;
    this.sound = sound;
    this.seed = seed;
    this.random = rng(seed);
    this.onChange = onChange;
    this.onEnd = onEnd;
    this.notify = notify;
    if (!beginRaid(save)) throw Error("请先完成整备");
    for (const item of [
      ...save.pack,
      ...save.secure,
      ...Object.values(save.equipment).filter((i): i is Item => !!i),
    ]) {
      item.raidBrought = item.qty;
      if (item.loaded) item.loaded.raidBrought = item.loaded.count;
    }
    this.ensureFood(true);
    save.pendingMap = map;
    for (const slot of ["primary", "secondary"] as const) {
      const i = save.equipment[slot];
      if (i) {
        this.magazines[i.uid] = i.loaded?.count ?? 0;
        this.magazineTiers[i.uid] = i.loaded?.tier ?? 1;
      }
    }
    this.ammoTier = Math.max(
      1,
      ...(save.equipment.ammo ? [db[save.equipment.ammo.id].tier] : []),
      ...save.pack
        .filter((i) => db[i.id].kind === "ammo")
        .map((i) => db[i.id].tier),
    );
    if (!save.equipment.primary)
      this.activeWeapon = save.equipment.secondary ? "secondary" : "melee";
    this.ammoTier =
      this.weaponItem?.loaded?.tier ??
      (save.equipment.ammo ? db[save.equipment.ammo.id].tier : this.ammoTier);
    this.build();
    this.loadMagazine(true);
    this.sound.mode = "raid";
    persist(save);
  }
  get weaponItem() {
    return this.save.equipment[this.activeWeapon];
  }
  get weapon() {
    return this.weaponItem ? db[this.weaponItem.id] : undefined;
  }
  get movementSpeed() {
    const speed =
      this.weapon?.kind === "melee" ? MOVEMENT.knifeSpeed : MOVEMENT.runSpeed;
    return this.p.exhausted
      ? (speed * MOVEMENT.exhaustedSpeed) / MOVEMENT.runSpeed
      : speed;
  }
  get mag() {
    return this.weaponItem ? this.magazines[this.weaponItem.uid] || 0 : 0;
  }
  set mag(v: number) {
    if (this.weaponItem) this.magazines[this.weaponItem.uid] = v;
  }
  get reserve() {
    return [
      ...this.save.pack,
      ...(this.save.equipment.ammo ? [this.save.equipment.ammo] : []),
    ]
      .filter((i) => i.id === `m${this.ammoTier}`)
      .reduce((n, i) => n + i.qty, 0);
  }
  build() {
    if (this.map === 0) {
      buildVillage(this);
      return;
    }
    const m = this.map;
    const C = ["#6f7b5f", "#8b7e62", "#597b7a", "#8eabb1"][m],
      T = ["#969d7c", "#b0a488", "#83a4a1", "#d2deda"][m];
    const add = (
      x: number,
      y: number,
      w: number,
      h: number,
      z = 55,
      label?: string,
      type = "crate",
    ) =>
      this.walls.push({
        x,
        y,
        w,
        h,
        z,
        color: type === "wall" ? C : T,
        label,
        type,
      });
    // Four walkable compounds with wide doors and interconnected lanes.
    this.rooms = [
      [
        [650, 560, 570, 430],
        [1700, 510, 720, 470],
        [690, 1280, 580, 420],
        [1720, 1260, 690, 480],
      ],
      [
        [650, 540, 570, 380],
        [1730, 520, 680, 440],
        [690, 1300, 580, 380],
        [1730, 1260, 650, 480],
      ],
      [
        [650, 550, 570, 410],
        [1700, 490, 720, 430],
        [690, 1290, 580, 400],
        [1720, 1260, 690, 480],
      ],
      [
        [650, 520, 570, 430],
        [1720, 510, 720, 470],
        [690, 1300, 580, 380],
        [1720, 1260, 690, 480],
      ],
    ][m];
    this.rooms.forEach(([x, y, w, h], i) => {
      add(x, y - h / 2, w, 18, 70, maps[m].zones[i], "wall");
      if (m !== 1 || i % 2 !== 0)
        add(x - w / 2, y, 18, h, 65, undefined, "wall");
      add(x + w / 2, y, 18, h, 65, undefined, "wall");
      if (m !== 1 || i % 2 === 0) {
        add(
          x - w / 2 + w * 0.18,
          y + h / 2,
          w * 0.36,
          18,
          48,
          undefined,
          "wall",
        );
        add(
          x + w / 2 - w * 0.18,
          y + h / 2,
          w * 0.36,
          18,
          48,
          undefined,
          "wall",
        );
      }
    });
    if (m === 2) {
      add(1140, 560, 110, 25, 65, undefined, "wall");
      add(1180, 1250, 28, 160, 55, undefined, "wall");
      add(2170, 500, 28, 230, 55, undefined, "wall");
    }
    if (m === 3) {
      add(1380, 750, 200, 20, 60, undefined, "wall");
      add(1600, 910, 25, 140, 55, undefined, "wall");
    }
    const props = [
      [510, 500, 85, 52],
      [780, 650, 100, 50],
      [1510, 380, 90, 70],
      [1830, 620, 80, 52],
      [620, 1190, 90, 60],
      [810, 1360, 80, 45],
      [1540, 1190, 110, 55],
      [1850, 1370, 95, 55],
      [1100, 900, 85, 60],
      [1320, 1050, 80, 55],
      [1080, 370, 90, 60],
      [350, 970, 90, 70],
      [2100, 1010, 80, 55],
    ];
    props.forEach(([x, y, w, h], i) =>
      add(
        x,
        y,
        w,
        h,
        35 + (i % 3) * 12,
        undefined,
        m === 1 && i % 3 === 0
          ? "vehicle"
          : m === 3 && i % 3 === 0
            ? "terminal"
            : m === 2 && i % 3 === 0
              ? "stall"
              : i % 4 === 0
                ? "barrel"
                : "crate",
      ),
    );
    const points = [
      [365, 1370],
      [490, 1280],
      [720, 1430],
      [740, 1110],
      [520, 600],
      [760, 470],
      [900, 780],
      [1070, 1180],
      [1250, 780],
      [1540, 500],
      [1900, 410],
      [1950, 650],
      [1600, 1360],
      [1890, 1180],
      [1500, 1100],
      [2120, 1450],
      [1150, 1470],
      [350, 760],
      [1100, 500],
      [2130, 800],
    ];
    points.forEach(([x, y], i) => {
      const type =
        i % 7 === 3
          ? "safe"
          : i % 5 === 0
            ? "weapon"
            : i % 6 === 0
              ? "medical"
              : i % 4 === 0
                ? "bed"
                : i % 3 === 0
                  ? "cabinet"
                  : ["box", "basket", "toolbox"][i % 3];
      const high = ["safe", "weapon", "bed"].includes(type);
      const entries = Array.from({ length: high ? 3 : 2 }, () =>
        loot(this.random, m, high),
      );
      if (type === "weapon")
        entries[0] = makeItem(randomWeapon(this.random, m).id);
      if (type === "medical") {
        const available = foods.filter((f) => f.tier <= Math.min(4, m + 2));
        entries[0] = makeItem(
          available[Math.floor(this.random() * available.length)].id,
        );
      }
      if (i % 3 === 0)
        entries.push(
          makeItem(
            `m${Math.min(4, m + 1)}`,
            15 + Math.floor(this.random() * 16),
          ),
        );
      this.containers.push({
        x,
        y,
        name: (
          {
            safe: "保险箱",
            weapon: "武器箱",
            medical: "医疗箱",
            bed: "豪华猫窝",
            cabinet: "工具柜",
            box: "纸箱",
            basket: "鸟窝",
            toolbox: "生锈工具盒",
          } as Record<string, string>
        )[type],
        type,
        items: entries,
        revealed: 0,
        open: false,
        locked: type === "safe",
        cooldown: 0,
      });
    });
    const enemyPoints = [
      [600, 1260],
      [850, 1100],
      [650, 700],
      [860, 470],
      [1200, 740],
      [1500, 620],
      [1910, 780],
      [1670, 1220],
      [1850, 1430],
      [1300, 1300],
      [2040, 1130],
      [1100, 380],
      [400, 820],
      [1950, 350],
      [1650, 1460],
      [980, 1020],
    ];
    const breedPool = [
      [0, 1, 2, 7, 9],
      [0, 2, 3, 4, 5, 6, 8, 9],
      [3, 4, 6, 8, 10, 11, 13],
      [5, 8, 10, 11, 12, 13, 14],
    ][m];
    enemyPoints
      .slice(0, 9 + m * 2)
      .forEach(([x, y], i) =>
        this.spawn(
          x,
          y,
          breedPool[i % breedPool.length],
          Math.max(1, Math.min(5, m + 1 + (i % 4 === 0 ? 1 : 0))),
        ),
      );
    if (
      m === 3 &&
      !["maine", "frost"].every((id) => this.save.defeated.includes(id))
    )
      add(1720, 745, 200, 22, 55, "需要两枚权限密钥", "wall");
    for (const b of bosses.filter((b) => b.map === m)) {
      if (
        b.id === "doctor" &&
        !["maine", "frost"].every((id) => this.save.defeated.includes(id))
      )
        continue;
      const point =
        b.id === "swift"
          ? this.random() > 0.5
            ? { x: 1730, y: 530 }
            : { x: 690, y: 1280 }
          : b.id === "yeed"
            ? this.random() > 0.5
              ? { x: 1830, y: 550 }
              : { x: 690, y: 1200 }
            : { x: b.x, y: b.y };
      this.spawn(point.x, point.y, b.breed, Math.min(5, m + 2), b);
    }
    if (m === 1)
      this.spawn(1510, 1120, 2, 3, {
        id: "optional",
        name: "收费员·斑叔",
        map: 1,
        breed: 2,
        hp: 500,
        weapon: 3,
        skill: "shotgun",
        x: 1510,
        y: 1120,
      });
    for (const c of this.containers) {
      const p = this.freePoint(c.x, c.y);
      c.x = p.x;
      c.y = p.y;
    }
    this.exits = [
      {
        x: 170,
        y: 1000,
        name: maps[m].free[0],
        paid: false,
        active: true,
        bought: false,
      },
      {
        x: 1100,
        y: 1640,
        name: maps[m].free[1],
        paid: false,
        active: true,
        bought: false,
      },
      {
        x: 2220,
        y: 1550,
        name: maps[m].paid,
        paid: true,
        active: true,
        bought: false,
      },
    ];
  }
  freePoint(x: number, y: number) {
    if (!this.blocked(x, y, 24)) return { x, y };
    for (let r = 30; r <= 180; r += 20)
      for (let n = 0; n < 16; n++) {
        const a = (n * Math.PI) / 8,
          px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r;
        if (!this.blocked(px, py, 24)) return { x: px, y: py };
      }
    return this.map === 0 ? { x: this.p.x, y: this.p.y } : { x: 1100, y: 1600 };
  }
  spawn(x: number, y: number, breed: number, tier: number, boss?: BossDef) {
    ({ x, y } = this.freePoint(x, y));
    const hp = boss?.hp ?? 55 + tier * 17;
    const weapon =
      boss?.weapon ??
      Number(
        randomWeapon(
          this.random,
          this.map,
          breed === 10
            ? "sniper"
            : breed === 13 || breed === 14
              ? "shotgun"
              : breed === 0 || breed === 7
                ? "smg"
                : "rifle",
          Math.max(1, tier - 1),
        ).id.slice(1),
      );
    const e: Enemy = {
      x,
      y,
      homeX: x,
      homeY: y,
      hp: hp * (1 + this.save.ng * 0.25),
      maxHp: hp * (1 + this.save.ng * 0.25),
      tier,
      armorDurability: armorDur[tier - 1],
      helmetDurability: helmetDur[tier - 1],
      breed,
      angle: 0,
      walk: 0,
      cool: 0.5 + this.random(),
      skillCool: 3 + this.random() * 3,
      state: "patrol",
      alert: 0,
      hit: 0,
      boss,
      id: boss?.id ?? crypto.randomUUID(),
      weapon,
      weaponDurability: weapons[weapon].durability!,
      mag: weapons[weapon].mag!,
      reload: 0,
      phase: 0,
      shield: 0,
      pathTime: 0,
    };
    this.enemies.push(e);
    return e;
  }
  blocked(x: number, y: number, r = 15) {
    return (
      x < 40 ||
      y < 70 ||
      x > this.width - 40 ||
      y > this.height - 40 ||
      (this.map === 0 && villageWaterBlocked(x, y, r)) ||
      this.walls.some((w) => hitsRect(x, y, w, r))
    );
  }
  moveActor(actor: { x: number; y: number }, dx: number, dy: number) {
    // Sweep short, validated steps: low frame rates must not tunnel through walls.
    const distance = Math.hypot(dx, dy),
      steps = Math.ceil(distance / 4);
    if (!steps) return;
    const sx = dx / steps,
      sy = dy / steps;
    for (let n = 0; n < steps; n++) {
      const ox = actor.x,
        oy = actor.y;
      if (!this.blocked(ox + sx, oy + sy)) {
        actor.x += sx;
        actor.y += sy;
        continue;
      }
      if (!this.blocked(actor.x + sx, actor.y)) actor.x += sx;
      if (!this.blocked(actor.x, actor.y + sy)) actor.y += sy;
      const progress =
        ((actor.x - ox) * sx + (actor.y - oy) * sy) / (sx * sx + sy * sy);
      // Only the walking player gets a small corner assist. No automatic wall
      // following, crossing water, skipping collisions or assistance during rolls.
      if (actor !== this.p || this.p.roll > 0 || progress > 0.25) continue;
      const length = distance / steps,
        ux = dx / distance,
        uy = dy / distance;
      const clear = (ax: number, ay: number, bx: number, by: number) => {
        const count = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
        for (let i = 1; i <= count; i++)
          if (
            this.blocked(
              ax + ((bx - ax) * i) / count,
              ay + ((by - ay) * i) / count,
            )
          )
            return false;
        return true;
      };
      let chosen = 0;
      for (let offset = 4; offset <= 32 && !chosen; offset += 4)
        for (const side of [-1, 1]) {
          const tx = actor.x - uy * offset * side,
            ty = actor.y + ux * offset * side;
          if (
            clear(actor.x, actor.y, tx, ty) &&
            clear(tx, ty, tx + ux * 42, ty + uy * 42)
          ) {
            chosen = side;
            break;
          }
        }
      if (chosen) {
        const tx = actor.x - uy * length * chosen,
          ty = actor.y + ux * length * chosen;
        if (clear(actor.x, actor.y, tx, ty)) {
          actor.x = tx;
          actor.y = ty;
        }
      }
    }
  }
  lineClear(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay),
      n = Math.ceil(d / 15);
    for (let i = 1; i < n; i++) {
      const x = ax + ((bx - ax) * i) / n,
        y = ay + ((by - ay) * i) / n;
      if (this.walls.some((w) => hitsRect(x, y, w, 2))) return false;
    }
    return true;
  }
  // Fine village navigation resolves doorways and bridges; other maps retain the 80-unit grid.
  route(e: Enemy, tx: number, ty: number) {
    if (this.map === 0) {
      routeVillage(this, e, tx, ty);
      return;
    }
    const cell = this.map === 0 ? 40 : 80,
      offset = cell / 2,
      cols = Math.ceil(this.width / cell),
      rows = Math.ceil(this.height / cell),
      start = [Math.floor(e.x / cell), Math.floor(e.y / cell)],
      goal = [Math.floor(tx / cell), Math.floor(ty / cell)],
      queue = [start],
      seen = new Map<string, string>();
    const k = (x: number, y: number) => `${x},${y}`;
    seen.set(k(...(start as [number, number])), "");
    let found = "";
    for (let n = 0; n < queue.length && n < cols * rows; n++) {
      const [x, y] = queue[n];
      if (x === goal[0] && y === goal[1]) {
        found = k(x, y);
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          key = k(nx, ny);
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= cols ||
          ny >= rows ||
          seen.has(key) ||
          this.blocked(nx * cell + offset, ny * cell + offset, 19)
        )
          continue;
        seen.set(key, k(x, y));
        queue.push([nx, ny]);
      }
    }
    const out: { x: number; y: number }[] = [];
    while (found && seen.get(found)) {
      const [x, y] = found.split(",").map(Number);
      out.unshift({ x: x * cell + offset, y: y * cell + offset });
      found = seen.get(found)!;
    }
    e.path = out;
  }
  interrupt(cancelHeal = false) {
    if (this.search || this.puzzle) {
      this.search = undefined;
      this.puzzle = undefined;
      this.puzzleContainer = undefined;
      this.searchProgress = 0;
      this.onChange();
    }
    if (this.heal > 0 && cancelHeal) {
      this.heal = 0;
      this.notify("进食被打断");
    }
  }
  loadMagazine(instant = false) {
    if (
      !this.weapon ||
      this.activeWeapon === "melee" ||
      this.reload ||
      this.mag >= this.weapon.mag!
    )
      return;
    if (!this.reserve) {
      this.notify("没有对应等级的备弹 · 在背包切换弹药");
      return;
    }
    if (instant) this.finishReload();
    else {
      this.interrupt();
      this.reload = this.weapon.reload!;
      this.sound.play("reload", 1, {
        weaponClass: this.weapon.weaponClass,
        seconds: this.weapon.reload,
      });
    }
  }
  finishReload() {
    this.reload = 0;
    this.sound.stopReload?.();
    if (!this.weapon) return;
    let count = Math.min(this.weapon.mag! - this.mag, this.reserve),
      brought = 0;
    this.mag += count;
    this.magazineTiers[this.weaponItem!.uid] = this.ammoTier;
    for (const i of [
      ...(this.save.equipment.ammo ? [this.save.equipment.ammo] : []),
      ...this.save.pack,
    ]) {
      if (i.id === `m${this.ammoTier}` && count > 0) {
        const used = Math.min(count, i.qty);
        brought += takeQuantity(i, used).raidBrought ?? 0;
        count -= used;
      }
    }
    const loaded = (this.weaponItem!.loaded ??= {
      tier: this.ammoTier,
      count: this.mag,
    });
    if (brought) loaded.raidBrought = (loaded.raidBrought ?? 0) + brought;
    this.save.pack = this.save.pack.filter((i) => i.qty > 0);
    refillAmmo(this.save, this.ammoTier);
    normalizeAmmo(this.save.pack);
    this.syncLoaded();
    persist(this.save);
    this.onChange();
  }
  swapWeapons(from: "primary" | "secondary", to: "primary" | "secondary") {
    this.syncLoaded();
    if (!swapWeaponSlots(this.save, from, to)) return false;
    if (this.activeWeapon !== "melee" && !this.weaponItem)
      this.activeWeapon = to;
    this.ammoTier = this.weaponItem?.loaded?.tier ?? this.ammoTier;
    this.reload = 0;
    this.sound.stopReload?.();
    this.syncLoaded();
    persist(this.save);
    this.sound.play("equip-weapon");
    return true;
  }
  selectWeapon(slot: "primary" | "secondary" | "melee") {
    const item = this.save.equipment[slot];
    if (!item) return false;
    if (this.activeWeapon !== slot) this.sound.play("equip-weapon");
    this.syncLoaded();
    this.activeWeapon = slot;
    this.ammoTier =
      this.magazineTiers[item.uid] ?? item.loaded?.tier ?? this.ammoTier;
    this.reload = 0;
    this.sound.stopReload?.();
    return true;
  }
  switchWeapon(direction = 1) {
    const slots = ["primary", "secondary", "melee"] as const;
    const current = slots.indexOf(this.activeWeapon);
    for (let step = 1; step <= slots.length; step++) {
      const next =
        slots[
          (current + Math.sign(direction || 1) * step + slots.length) %
            slots.length
        ];
      if (this.selectWeapon(next)) {
        this.interrupt();
        this.onChange();
        return;
      }
    }
  }
  equipLoot(uid: string, secondary = true) {
    const item = this.save.pack.find((i) => i.uid === uid);
    if (!item) return false;
    if (db[item.id].kind === "ammo") return this.loadAmmo("pack", uid);
    this.syncLoaded();
    const ok = equip(this.save, "pack", uid, secondary);
    if (ok && db[item.id].kind === "weapon") {
      this.magazines[item.uid] = item.loaded?.count ?? 0;
      this.magazineTiers[item.uid] = item.loaded?.tier ?? this.ammoTier;
      if (this.weaponItem?.uid === item.uid)
        this.ammoTier = this.magazineTiers[item.uid];
      this.reload = 0;
      this.sound.stopReload?.();
      this.syncLoaded();
    }

    if (ok)
      this.sound.play(
        db[item.id].kind === "weapon" || db[item.id].kind === "melee"
          ? "equip-weapon"
          : "equip-gear",
      );
    return ok;
  }
  loadAmmo(
    from: "pack" | "stash" | "secure" | "overflow" | "equipment" | "loot",
    uid: string,
    target?: "primary" | "secondary",
  ) {
    this.syncLoaded();
    const slot =
      target ??
      (this.activeWeapon !== "melee" && this.weaponItem
        ? this.activeWeapon
        : this.save.equipment.primary
          ? "primary"
          : this.save.equipment.secondary
            ? "secondary"
            : undefined);
    const oldTier = this.ammoTier;
    const container = from === "loot" ? this.search : undefined;
    const external = container?.items
      .slice(0, container.revealed)
      .find((i) => i.uid === uid);
    if (from === "loot" && !external) return false;
    if (!selectAmmo(this.save, from, uid, slot, !!target, external)) {
      this.notify("背包空间不足，无法卸下当前弹药");
      return false;
    }
    if (external && container) {
      container.items = container.items.filter((i) => i.uid !== uid);
      container.revealed--;
    }
    for (const key of ["primary", "secondary"] as const) {
      const weapon = this.save.equipment[key];
      if (weapon) {
        this.magazines[weapon.uid] = weapon.loaded?.count ?? 0;
        this.magazineTiers[weapon.uid] = weapon.loaded?.tier ?? 1;
      }
    }
    this.ammoTier =
      this.weaponItem?.loaded?.tier ??
      (this.save.equipment.ammo
        ? db[this.save.equipment.ammo.id].tier
        : oldTier);
    this.reload = 0;
    this.sound.stopReload?.();
    if (!target && oldTier !== this.ammoTier && this.weaponItem)
      this.loadMagazine();
    persist(this.save);
    this.onChange();
    return true;
  }
  switchAmmo(tier: number) {
    if (
      tier < 1 ||
      tier > 4 ||
      !this.weaponItem ||
      this.activeWeapon === "melee"
    )
      return;
    const equipped = this.save.equipment.ammo;
    const item =
      equipped?.id === `m${tier}`
        ? equipped
        : this.save.pack.find((i) => i.id === `m${tier}`);
    if (item) this.loadAmmo(item === equipped ? "equipment" : "pack", item.uid);
  }
  unequipToPack(slot: keyof Save["equipment"]) {
    const i = this.save.equipment[slot];
    if (!i) return false;
    this.syncLoaded();
    const next = structuredClone(this.save.pack),
      cap = slot === "bag" ? BASE_PACK : packCapacity(this.save);
    if (next.length > cap || !put(next, i, cap)) return false;
    this.save.pack = next;
    this.save.equipment[slot] = null;
    delete this.magazines[i.uid];
    delete this.magazineTiers[i.uid];
    this.reload = 0;
    this.sound.stopReload?.();
    this.syncLoaded();
    persist(this.save);
    return true;
  }
  roll(dx: number, dy: number) {
    if (
      this.p.stamina < MOVEMENT.rollCost ||
      this.p.rollCooldown > 0 ||
      this.p.roll
    )
      return;
    this.interrupt(true);
    this.p.stamina -= MOVEMENT.rollCost;
    if (this.p.stamina <= 0) this.p.exhausted = true;
    this.p.rollAim = this.p.angle;
    this.p.roll = 0.35;
    this.p.rollCooldown = 0.6;
    const l = Math.hypot(dx, dy);
    this.p.rollX = l ? dx / l : Math.cos(this.p.angle);
    this.p.rollY = l ? dy / l : Math.sin(this.p.angle);
    this.sound.play("roll");
  }
  ensureFood(forceLowest = false) {
    if (!forceLowest && this.save.equipment.food?.qty) return;
    const available = [
      ...this.save.pack,
      ...(this.save.equipment.food ? [this.save.equipment.food] : []),
    ]
      .filter((i) => db[i.id].kind === "food" && i.qty > 0)
      .sort(
        (a, b) =>
          db[a.id].tier - db[b.id].tier || db[a.id].price - db[b.id].price,
      );
    const next = available[0];
    if (!next) {
      this.save.equipment.food = null;
      return;
    }
    if (this.save.equipment.food?.uid === next.uid) return;
    const old = this.save.equipment.food;
    this.save.pack = this.save.pack.filter((i) => i.uid !== next.uid);
    this.save.equipment.food = next;
    if (old?.qty) put(this.save.pack, old, packCapacity(this.save));
  }
  useFood(uid?: string, source: "pack" | "loot" = "pack") {
    if (this.heal || this.p.hp >= 100) return;
    this.ensureFood();
    const owned = [
      ...this.save.pack,
      ...(this.save.equipment.food ? [this.save.equipment.food] : []),
    ];
    const food = uid
      ? (source === "loot"
          ? (this.search?.items.slice(0, this.search.revealed) ?? [])
          : owned
        ).find((i) => i.uid === uid && db[i.id].kind === "food")
      : this.save.equipment.food;
    if (!food) {
      this.notify("没有食物 · 搜索医疗箱或回基地购买");
      return;
    }
    this.healItem = food.uid;
    this.healSource = source === "loot" ? this.search : undefined;
    this.healDuration = db[food.id].useTime!;
    this.heal = this.healDuration;
    this.onChange();
  }
  shoot() {
    if (this.activeWeapon === "melee") {
      this.swingMelee();
      return;
    }
    if (
      !this.weapon ||
      this.reload ||
      this.fireCool > 0 ||
      this.p.roll ||
      this.inventory ||
      this.mapOpen ||
      this.puzzle
    )
      return;
    if (!this.mag) {
      this.loadMagazine();
      return;
    }
    this.interrupt(true);
    this.mag--;
    if (this.weaponItem?.loaded?.raidBrought)
      this.weaponItem.loaded.raidBrought--;
    this.syncLoaded();
    this.fireCool = 60 / this.weapon.rpm!;
    const count = this.weapon.pellets ?? 1;
    for (let pellet = 0; pellet < count; pellet++) {
      const spread =
        count > 1
          ? (pellet / (count - 1) - 0.5) * 2 + (this.random() - 0.5) * 0.15
          : (this.random() - 0.5) * 2;
      const a = this.p.angle + spread * this.weapon.spread!;
      this.addBullet(
        this.p.x,
        this.p.y - 24,
        a,
        true,
        this.weapon.damage! *
          weaponDamageScale(
            this.weaponItem!.durability ?? this.weapon.durability!,
          ),
        this.ammoTier,
        this.weapon.range!,
        count > 1,
        pellet === 0,
      );
    }
    this.sound.play("shot", 1, { weaponClass: this.weapon.weaponClass });
    wearWeapon(this.weaponItem!);
    this.shake = Math.max(
      this.shake,
      count > 1 || this.weapon.damage! > 60 ? 5 : 2,
    );
    this.emit(
      this.p.x + Math.cos(this.p.angle) * 44,
      this.p.y - 24 + Math.sin(this.p.angle) * 44,
      5,
      "#ffe4a4",
    );
    this.alert(this.p.x, this.p.y, 420);
  }
  syncLoaded() {
    for (const slot of ["primary", "secondary"] as const) {
      const w = this.save.equipment[slot];
      if (w)
        w.loaded = {
          tier: this.magazineTiers[w.uid] ?? w.loaded?.tier ?? this.ammoTier,
          count: this.magazines[w.uid] ?? w.loaded?.count ?? 0,
          ...(w.loaded?.raidBrought
            ? {
                raidBrought: Math.min(
                  w.loaded.raidBrought,
                  this.magazines[w.uid] ?? w.loaded.count,
                ),
              }
            : {}),
        };
    }
    delete this.save.loadedRounds;
  }
  swingMelee() {
    if (
      this.inventory ||
      this.paused ||
      this.mapOpen ||
      this.meleeCooldown > 0 ||
      this.p.roll ||
      !this.save.equipment.melee
    )
      return;
    this.meleeCooldown = MELEE_SWING_SECONDS;
    this.meleeSwing++;
    this.interrupt(true);
    this.sound.play("melee");
    this.combatFX.push({
      kind: "melee",
      x: this.p.x,
      y: this.p.y - 24,
      angle: this.p.angle,
      friendly: true,
      life: 0.25,
      max: 0.25,
    });
    for (const e of [...this.enemies]) {
      const a = Math.atan2(e.y - this.p.y, e.x - this.p.x),
        diff = Math.atan2(
          Math.sin(a - this.p.angle),
          Math.cos(a - this.p.angle),
        );
      if (
        Math.hypot(e.x - this.p.x, e.y - this.p.y) < 85 &&
        Math.abs(diff) < 1.2 &&
        this.lineClear(this.p.x, this.p.y, e.x, e.y)
      )
        this.hurtEnemy(e, {
          x: e.x,
          y: e.y - 24,
          vx: Math.cos(a),
          vy: Math.sin(a),
          damage: melee.damage!,
          tier: 1,
          friendly: true,
          travel: 0,
          range: 85,
          life: 0,
        });
    }
  }
  dropItem(uid: string) {
    const i = this.save.pack.find((i) => i.uid === uid);
    if (!i) return false;
    this.save.pack = this.save.pack.filter((v) => v !== i);
    persist(this.save);
    this.onChange();
    return true;
  }
  engage(e: Enemy) {
    const initial = e.state !== "combat";
    e.state = "combat";
    e.alert = 8;
    e.target = { x: this.p.x, y: this.p.y };
    if (!initial) return;
    for (const ally of this.enemies) {
      if (ally === e) continue;
      if (
        this.map === 0 &&
        e.squad?.startsWith("boss") &&
        ally.squad !== e.squad
      )
        continue;
      const sameRoom = this.rooms.some(
        ([x, y, w, h, rotation]) =>
          hitsRect(e.x, e.y, { x, y, w, h, rotation }) &&
          hitsRect(ally.x, ally.y, { x, y, w, h, rotation }),
      );
      if (
        sameRoom ||
        (Math.hypot(e.x - ally.x, e.y - ally.y) < 320 &&
          this.lineClear(e.x, e.y, ally.x, ally.y))
      ) {
        ally.state = "combat";
        ally.alert = 8;
        ally.target = { x: this.p.x, y: this.p.y };
      }
    }
  }
  addBullet(
    x: number,
    y: number,
    a: number,
    friendly: boolean,
    dmg: number,
    tier: number,
    range = 800,
    shotgun = false,
    muzzle = true,
  ) {
    const speed = friendly ? 1050 : 440;
    if (muzzle)
      this.combatFX.push({
        kind: "muzzle",
        x: x + Math.cos(a) * 40,
        y: y + Math.sin(a) * 40,
        angle: a,
        friendly,
        life: 0.18,
        max: 0.18,
      });
    this.bullets.push({
      x: x + Math.cos(a) * 32,
      y: y + Math.sin(a) * 32,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: range / speed,
      friendly,
      damage: dmg,
      tier,
      range,
      travel: 0,
      shotgun,
    });
  }
  alert(x: number, y: number, radius: number) {
    for (const e of this.enemies)
      if (Math.hypot(e.x - x, e.y - y) < radius) {
        e.alert = 5;
        e.target = { x, y };
        if (e.state === "patrol") e.state = "investigate";
      }
  }
  interact() {
    if (this.search || this.puzzle) {
      this.inventory = false;
      this.interrupt();
      return;
    }
    const c = this.containers
      .filter(
        (c) =>
          Math.hypot(c.x - this.p.x, c.y - this.p.y) < 90 &&
          this.lineClear(this.p.x, this.p.y, c.x, c.y),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.p.x, a.y - this.p.y) -
          Math.hypot(b.x - this.p.x, b.y - this.p.y),
      )[0];
    if (c) {
      if (c.cooldown > 0) {
        this.notify("保险箱暂时锁定");
        return;
      }
      if (c.locked) {
        this.puzzleContainer = c;
        this.puzzle = mathQuestion(this.random);
      } else this.startSearch(c);
      this.onChange();
      return;
    }
    const ex = this.exits.find(
      (e) =>
        e.active &&
        Math.hypot(e.x - this.p.x, e.y - this.p.y) < (e.paid ? 170 : 85),
    );
    if (ex?.paid && !ex.bought) {
      if (this.save.coins < maps[this.map].fee) {
        this.notify(`需要 ${maps[this.map].fee} 金币`);
        return;
      }
      this.save.coins -= maps[this.map].fee;
      ex.bought = true;
      persist(this.save);
      if (this.map === 2)
        for (let i = 0; i < 2; i++)
          this.spawn(ex.x - 130, ex.y - 140 - i * 40, 3, 3);
      this.notify("撤离已启动 · 留在圈内 3 秒");
    }
  }
  answer(v: number) {
    if (!this.puzzle || !this.puzzleContainer) return;
    const c = this.puzzleContainer;
    if (v === this.puzzle.answer) {
      c.locked = false;
      this.puzzle = undefined;
      this.puzzleContainer = undefined;
      this.startSearch(c);
      this.sound.play("loot", 2);
    } else {
      c.cooldown = 3;
      this.puzzle = undefined;
      this.puzzleContainer = undefined;
      this.sound.play("alert");
      this.alert(c.x, c.y, 650);
      this.notify("答案错误 · 锁定 3 秒，附近敌猫已警觉");
    }
    this.onChange();
  }
  startSearch(c: Container) {
    for (const item of c.items.slice(0, c.revealed)) this.discover(item);
    this.search = c;
    this.searchProgress = 0;
    this.stats.searches += c.open ? 0 : 1;
    c.open = true;
    this.inventory = true;
    this.sound.play("search");
  }
  discover(item: Item) {
    if (db[item.id].kind !== "collectible") return false;
    const known = (this.save.discovered ??= [...this.save.collection]);
    const fresh = !known.includes(item.id);
    if (
      db[item.id].kind === "collectible" &&
      !this.save.collection.includes(item.id)
    )
      this.save.collection.push(item.id);
    if (fresh) {
      known.push(item.id);
      if (this.onDiscover) this.onDiscover(item);
      else this.notify(`首次发现 · ${db[item.id].name}`);
      persist(this.save);
    }
    return fresh;
  }
  take(index: number, safe = false, autoEquip = false) {
    const c = this.search;
    if (!c || index < 0 || index >= c.revealed) return;
    const candidate = c.items[index],
      kind = db[candidate.id].kind;
    if (autoEquip && !safe && kind === "weapon") {
      const empty = !this.save.equipment.primary
        ? "primary"
        : !this.save.equipment.secondary
          ? "secondary"
          : undefined;
      if (empty) {
        this.equipContainer(candidate.uid, empty);
        return;
      }
    }
    if (
      autoEquip &&
      (kind === "armor" || kind === "helmet") &&
      protection(candidate) > protection(this.save.equipment[kind])
    ) {
      this.equipContainer(candidate.uid, kind);
      return;
    }
    const i = c.items[index],
      target = safe ? this.save.secure : this.save.pack,
      cap = safe ? [1, 2, 4, 6][this.save.safe] : packCapacity(this.save);
    if (!safe && kind === "ammo") {
      const next = structuredClone(this.save);
      next.pack.push(structuredClone(i));
      refillAmmo(next, this.ammoTier);
      if (next.pack.length > cap) {
        this.notify("背包已满");
        return;
      }
      this.save.pack = next.pack;
      this.save.equipment.ammo = next.equipment.ammo;
    } else if (!canPut(target, i, cap)) {
      this.notify(safe ? "安全箱已满" : "背包已满 · 丢弃物品或更换背包");
      return;
    }
    if (safe || kind !== "ammo") put(target, i, cap);
    if (!safe && db[i.id].kind === "food") this.ensureFood();
    this.discover(i);
    this.value += sale(i);
    c.items.splice(index, 1);
    c.revealed--;
    persist(this.save);
    this.sound.play("click");
    this.onChange();
  }
  equipContainer(uid: string, requested?: keyof Save["equipment"]) {
    const c = this.search,
      index = c?.items.findIndex((i) => i.uid === uid) ?? -1;
    if (!c || index < 0 || index >= c.revealed) return false;
    this.syncLoaded();
    const item = c.items[index],
      kind = db[item.id].kind;
    if (kind === "ammo")
      return this.loadAmmo(
        "loot",
        uid,
        requested === "primary" || requested === "secondary"
          ? requested
          : undefined,
      );
    const slot = requested ?? (kind === "weapon" ? "secondary" : kind);
    if (
      !(["primary", "secondary"].includes(slot)
        ? kind === "weapon"
        : kind === slot &&
          ["armor", "helmet", "bag", "ammo", "melee", "food"].includes(slot))
    )
      return false;
    const key = slot as keyof Save["equipment"];
    if (key === "bag" && this.save.pack.length > db[item.id].capacity!)
      return false;
    const old = this.save.equipment[key],
      returned: Item[] = old ? [old] : [];
    if (old && kind === "weapon") {
      delete this.magazines[old.uid];
      delete this.magazineTiers[old.uid];
    }
    c.items.splice(index, 1, ...returned);
    c.revealed += returned.length - 1;
    this.save.equipment[key] = item;
    if (kind === "weapon") {
      this.magazines[item.uid] = item.loaded?.count ?? 0;
      this.magazineTiers[item.uid] = item.loaded?.tier ?? this.ammoTier;
      if (this.weaponItem?.uid === item.uid)
        this.ammoTier = this.magazineTiers[item.uid];
      this.reload = 0;
      this.sound.stopReload?.();
      this.syncLoaded();
    }
    this.value += Math.floor(db[item.id].price * 0.65);
    persist(this.save);
    this.sound.play(
      kind === "weapon" || kind === "melee" ? "equip-weapon" : "equip-gear",
    );
    this.onChange();
    return true;
  }
  hurtPlayer(dmg: number, tier: number, head = false) {
    if (this.done) return;
    this.combatFX.push({
      kind: "hit",
      x: this.p.x,
      y: this.p.y - 24,
      angle: 0,
      friendly: false,
      life: 0.25,
      max: 0.25,
    });
    // Taking damage preserves container search and its current reveal progress.
    const armor = this.save.equipment[head ? "helmet" : "armor"];
    let taken = damage(
      dmg,
      tier,
      armor ? db[armor.id].tier : 0,
      armor?.durability ?? 0,
      head,
    );
    if (this.p.roll > 0.17) taken *= 0.2;
    this.p.hp -= taken;
    this.stats.damageTaken += taken;
    if (armor)
      armor.durability = Math.max(0, (armor.durability ?? 0) - dmg * 0.25);
    this.p.hit = 0.25;
    this.shake = 5;
    this.sound.play("hurt");
    this.float(this.p.x, this.p.y - 75, `−${Math.round(taken)}`, "#f2a186");
    if (this.p.hp <= 0) this.finish(false, "在战区倒下了");
  }
  hurtEnemy(e: Enemy, b: Bullet) {
    this.combatFX.push({
      kind: "hit",
      x: b.x,
      y: b.y,
      angle: Math.atan2(b.vy, b.vx),
      friendly: true,
      life: 0.25,
      max: 0.25,
    });
    const head = b.y < e.y - 34;
    let d = damage(
      b.damage,
      b.tier,
      e.tier,
      head ? e.helmetDurability : e.armorDurability,
      head,
      projectileFalloff(b),
    );
    if (e.shield > 0) d *= 0.35;
    if (head)
      e.helmetDurability = Math.max(0, e.helmetDurability - b.damage * 0.25);
    else e.armorDurability = Math.max(0, e.armorDurability - b.damage * 0.25);
    e.hp -= d;
    this.stats.damageDealt += d;
    e.hit = 0.12;
    e.alert = 6;
    this.engage(e);
    e.target = { x: this.p.x, y: this.p.y };
    this.float(
      e.x,
      e.y - 74,
      `${Math.round(d)}${head ? "!" : ""}`,
      head ? "#f7d38a" : "#fff1cc",
    );
    this.emit(b.x, b.y, 5, "#e5c193");
    this.sound.play("hit");
    if (e.hp <= 0) this.kill(e);
  }
  kill(e: Enemy) {
    this.stats.kills++;
    this.emit(e.x, e.y - 20, 15, "#b9ba8c");
    const items = [
      makeItem(`w${e.weapon}`),
      makeItem(`a${e.tier}`),
      makeItem(`h${e.tier}`),
      makeItem(`m${Math.min(4, e.tier)}`, 20 + Math.floor(this.random() * 31)),
    ];
    items[0].durability = e.weaponDurability;
    items[1].durability = e.armorDurability;
    items[2].durability = e.helmetDurability;
    for (let n = 0; n < (e.boss ? 3 : Math.floor(this.random() * 3)); n++)
      items.push(loot(this.random, this.map, !!e.boss));
    this.containers.push({
      x: e.x,
      y: e.y,
      name: `${e.boss?.name ?? breeds[e.breed].name}的战利品`,
      type: "corpse",
      bossLoot: !!e.boss,
      items,
      revealed: 0,
      open: false,
      locked: false,
      cooldown: 0,
    });
    if (e.boss && e.id !== "optional") {
      if (!this.pendingBosses.includes(e.id)) this.pendingBosses.push(e.id);
      this.notify(`击败 ${e.boss.name} · 成功撤离以保存进度`);
      this.sound.play("success");
    }
    this.enemies = this.enemies.filter((x) => x !== e);
  }
  abort() {
    if (this.done || !cancelRaid(this.save)) return false;
    this.done = true;
    this.sound.mode = "base";
    this.search = undefined;
    this.puzzle = undefined;
    this.inventory = false;
    return true;
  }
  finish(success: boolean, reason: string) {
    if (this.done) return;
    this.done = true;
    this.interrupt();
    this.syncLoaded();
    normalizeAmmo(this.save.pack);
    const result: Result = {
      success,
      reason,
      map: this.map,
      ...this.stats,
      value: this.extractedLootValue(),
      time: this.elapsed,
      bosses: success ? this.pendingBosses : [],
      reward: success ? 300 + this.map * 350 : 0,
    };
    settle(this.save, result);
    this.sound.mode = "base";
    this.sound.play(success ? "success" : "death");
    this.onEnd(result);
  }
  extractedLootValue() {
    const carried = [
      ...this.save.pack,
      ...this.save.secure,
      ...Object.values(this.save.equipment).filter((i): i is Item => !!i),
    ];
    return carried.reduce((sum, item) => {
      const fresh = Math.max(0, item.qty - (item.raidBrought ?? 0));
      const rounds = item.loaded
        ? Math.max(0, item.loaded.count - (item.loaded.raidBrought ?? 0))
        : 0;
      return (
        sum +
        (fresh ? sale({ ...item, qty: fresh }) : 0) +
        (rounds
          ? sale({
              id: `m${item.loaded!.tier}`,
              uid: item.uid + ":loaded",
              qty: rounds,
            })
          : 0)
      );
    }, 0);
  }
  emit(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const a = this.random() * Math.PI * 2,
        s = 20 + this.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.2 + this.random() * 0.3,
        max: 0.5,
        color,
        size: 2 + this.random() * 3,
      });
    }
  }
  float(x: number, y: number, t: string, color: string) {
    this.floating.push({ x, y, text: t, life: 1, color });
  }
  update(
    dt: number,
    keys: Set<string>,
    mouse: { x: number; y: number; down: boolean },
  ) {
    if (this.paused || this.done) return;
    dt = Math.min(0.05, dt);
    this.time -= dt;
    this.elapsed += dt;
    this.footprints = this.footprints.filter(
      (mark) => (mark.life -= dt) > 1e-8,
    );
    if (this.time <= 0) {
      this.finish(false, "行动超时，未能撤离");
      return;
    }
    if (this.time < 300 && !this.warning) {
      this.warning = true;
      this.notify("最后 5 分钟 · 立即规划撤离路线");
    }
    const p = this.p;
    let dx = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      dy = (keys.has("KeyS") ? 1 : 0) - (keys.has("KeyW") ? 1 : 0),
      l = Math.hypot(dx, dy);
    if (l) {
      dx /= l;
      dy /= l;
    }
    p.angle = Math.atan2(mouse.y - (p.y - 24), mouse.x - p.x);
    p.rollCooldown -= dt;
    p.hit -= dt;
    this.fireCool -= dt;
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 20);

    const sprint =
      l > 0 && !this.mapOpen && !p.roll && p.stamina > 0 && !p.exhausted;
    if (l && !this.mapOpen && !p.roll) {
      this.interrupt(false);
      if (sprint) {
        p.stamina = Math.max(0, p.stamina - dt * MOVEMENT.drainPerSecond);
        if (p.stamina < 1e-8) p.stamina = 0;
        if (p.stamina <= 0) {
          p.exhausted = true;
        }
      }
      const oldX = p.x,
        oldY = p.y;
      this.moveActor(
        p,
        dx * this.movementSpeed * dt,
        dy * this.movementSpeed * dt,
      );
      const moved = Math.hypot(p.x - oldX, p.y - oldY);
      p.moveAngle =
        moved > 1e-6 ? Math.atan2(p.y - oldY, p.x - oldX) : Math.atan2(dy, dx);
      p.walk += dt * (sprint ? 15 : 10);
      if (this.map === 0) {
        this.footstepDistance += moved;
        if (moved > 0 && this.footstepDistance >= 52) {
          this.footstepDistance %= 52;
          const angle = Math.atan2(p.y - oldY, p.x - oldX);
          this.footprints.push({
            x: p.x - Math.sin(angle) * this.footstepSide * 5.5,
            y: p.y + Math.cos(angle) * this.footstepSide * 5.5,
            angle,
            life: 2,
          });
          this.footstepSide *= -1;
        }
      }
    } else {
      p.walk = 0;
      this.footstepDistance = 0;
    }
    if (p.roll > 0) {
      p.roll = Math.max(0, p.roll - dt);
      this.moveActor(p, p.rollX * 390 * dt, p.rollY * 390 * dt);
    }
    if (!sprint)
      p.stamina = Math.min(
        MOVEMENT.maxStamina,
        p.stamina + MOVEMENT.recoveryPerSecond * dt,
      );
    if (p.stamina >= MOVEMENT.recoverThreshold) p.exhausted = false;
    if (mouse.down) this.shoot();
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) this.finishReload();
    }
    if (this.regeneration.remaining > 0) {
      const duration = Math.min(dt, this.regeneration.remaining);
      p.hp = Math.min(100, p.hp + duration * this.regeneration.rate);
      this.regeneration.remaining = Math.max(
        0,
        this.regeneration.remaining - duration,
      );
    }
    if (this.heal > 0) {
      this.heal -= dt;
      if (this.heal <= 0) {
        this.heal = 0;
        const source = this.healSource?.items ?? [
          ...this.save.pack,
          ...(this.save.equipment.food ? [this.save.equipment.food] : []),
        ];
        const food = source.find((i) => i.uid === this.healItem);
        if (food) {
          const d = db[food.id];
          p.hp = Math.min(100, p.hp + (d.heal ?? 0));
          if (d.healOverTime && d.healSeconds)
            this.regeneration = {
              remaining: d.healSeconds,
              rate: d.healOverTime / d.healSeconds,
            };
          takeQuantity(food, 1);
          if (food.qty === 0) {
            if (this.healSource) {
              source.splice(source.indexOf(food), 1);
              this.healSource.revealed--;
            } else if (this.save.equipment.food?.uid === food.uid)
              this.save.equipment.food = null;
            else this.save.pack = this.save.pack.filter((i) => i !== food);
          }
          this.healSource = undefined;
          this.ensureFood();
          this.sound.play("heal");
          persist(this.save);
          this.onChange();
        }
      }
    }
    if (this.search) {
      const c = this.search;
      if (Math.hypot(c.x - p.x, c.y - p.y) > 100) this.interrupt();
      else if (c.revealed < c.items.length) {
        this.searchProgress += dt;
        const duration = searchTime(c.items[c.revealed]);
        if (this.searchProgress >= duration) {
          const item = c.items[c.revealed];
          c.revealed++;
          this.searchProgress = 0;
          this.sound.play("loot", db[item.id].tier);
          this.discover(item);
          if (db[item.id].kind === "collectible" && db[item.id].tier >= 3) {
            this.emit(c.x, c.y - 20, 25, colors[db[item.id].tier]);
          }
          this.onChange();
        }
      }
    }
    this.near = this.containers
      .filter(
        (c) =>
          Math.hypot(c.x - p.x, c.y - p.y) < 85 &&
          this.lineClear(p.x, p.y, c.x, c.y),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0];
    this.exit = this.exits.find(
      (e) => e.active && Math.hypot(e.x - p.x, e.y - p.y) < 65,
    );
    if (this.exit && (!this.exit.paid || this.exit.bought)) {
      this.extract += dt;
      if (this.extract >= EXTRACT_SECONDS) {
        this.finish(true, "成功撤离");
        return;
        return;
      }
    } else this.extract = 0;
    for (const c of this.containers) c.cooldown = Math.max(0, c.cooldown - dt);
    for (const e of [...this.enemies]) this.updateEnemy(e, dt);
    for (const b of this.bullets) {
      const steps = 3;
      for (let n = 0; n < steps && b.life > 0; n++) {
        const dx = (b.vx * dt) / steps,
          dy = (b.vy * dt) / steps;
        b.x += dx;
        b.y += dy;
        b.travel += Math.hypot(dx, dy);
        b.life -= dt / steps;
        if (this.walls.some((w) => hitsRect(b.x, b.y + 20, w, 2))) {
          b.life = 0;
          this.emit(b.x, b.y, 3, "#afbc99");
          this.combatFX.push({
            kind: "hit",
            x: b.x,
            y: b.y,
            angle: 0,
            friendly: b.friendly,
            life: 0.25,
            max: 0.25,
          });
          break;
        }
        if (b.friendly) {
          const e = this.enemies.find(
            (e) => Math.hypot(e.x - b.x, e.y - 25 - b.y) < (e.boss ? 28 : 22),
          );
          if (e) {
            this.hurtEnemy(e, b);
            b.life = 0;
          }
        } else if (Math.hypot(p.x - b.x, p.y - 25 - b.y) < 20) {
          this.hurtPlayer(
            b.damage * (b.shotgun ? projectileFalloff(b) : 1),
            b.tier,
            b.y < p.y - 34,
          );
          b.life = 0;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 80 * dt;
      q.life -= dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);
    for (const fx of this.combatFX) fx.life -= dt;
    this.combatFX = this.combatFX.filter((fx) => fx.life > 0);
    for (const f of this.floating) {
      f.y -= 25 * dt;
      f.life -= dt;
    }
    this.floating = this.floating.filter((f) => f.life > 0);
    this.tick += dt;
    this.checkpoint += dt;
    if (this.checkpoint >= 2) {
      this.checkpoint = 0;
      this.syncLoaded();
      persist(this.save);
    }
    this.sound.mode = this.enemies.some((e) => e.boss && e.state === "combat")
      ? "boss"
      : "raid";
  }
  updateEnemy(e: Enemy, dt: number) {
    const p = this.p,
      d = Math.hypot(e.x - p.x, e.y - p.y),
      role = e.breed < 0 ? "boss" : breeds[e.breed].role;
    e.hit -= dt;
    e.cool -= dt;
    e.skillCool -= dt;
    e.shield -= dt;
    e.pathTime -= dt;
    e.alert -= dt;
    const canSee =
      d < (role === "sniper" ? 780 : 560) && this.lineClear(e.x, e.y, p.x, p.y);
    if (canSee) {
      this.engage(e);
      e.alert = 6;
      e.target = { x: p.x, y: p.y };
    } else if (e.alert <= 0 && e.state !== "patrol") {
      e.state = "patrol";
      e.path = [];
    }
    if (e.reload > 0) {
      e.reload -= dt;
      if (e.reload <= 0) e.mag = weapons[e.weapon].mag!;
    }
    if (e.telegraph) {
      e.telegraph.time -= dt;
      if (e.telegraph.time <= 0) {
        const target = e.telegraph;
        if (e.boss?.skill === "charge") {
          const a = Math.atan2(target.y - e.y, target.x - e.x);
          for (let k = 0; k < 12; k++)
            this.moveActor(e, Math.cos(a) * 20, Math.sin(a) * 20);
          if (Math.hypot(p.x - e.x, p.y - e.y) < 90) this.hurtPlayer(35, 4);
          this.emit(e.x, e.y, 30, "#d4b58b");
        } else {
          if (Math.hypot(target.x - p.x, target.y - p.y) < 70)
            this.hurtPlayer(22, Math.min(4, e.tier));
          this.emit(target.x, target.y, 25, "#eab87a");
        }
        e.telegraph = undefined;
      }
    }
    if (e.state === "combat" && canSee) {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      if (
        e.cool <= 0 &&
        e.reload <= 0 &&
        !e.telegraph &&
        d < weapons[e.weapon].range! + 30
      ) {
        if (!e.mag) {
          e.reload = weapons[e.weapon].reload!;
          this.sound.play("reload", 1, {
            weaponClass: weapons[e.weapon].weaponClass,
            seconds: e.reload,
            enemy: true,
          });
        } else {
          const gun = weapons[e.weapon];
          const shots = gun.pellets ?? 1;
          for (let i = 0; i < shots; i++)
            this.addBullet(
              e.x,
              e.y - 24,
              e.angle +
                (this.random() - 0.5) *
                  (shots > 1 ? gun.spread! * 2 : 0.15 + 0.04 * (5 - e.tier)),
              false,
              (e.boss ? 14 + this.map * 2 : 8 + this.map * 2) *
                weaponDamageScale(e.weaponDurability) *
                (shots > 1 ? (e.boss ? 4 : 2.8) / shots : 1),
              Math.min(4, e.tier),
              gun.range!,
              shots > 1,
              i === 0,
            );
          e.mag--;
          e.weaponDurability = Math.max(
            0,
            e.weaponDurability - weapons[e.weapon].durability! / 700,
          );
          e.cool = Math.max(
            60 / gun.rpm!,
            e.boss?.skill === "shotgun"
              ? 1.5
              : e.boss?.skill === "turret"
                ? 0.7
                : e.boss?.skill === "shield"
                  ? 0.25
                  : role === "sniper"
                    ? 1.7
                    : 0.65 + this.random() * 0.65,
          );
          this.sound.play("shot", 1, {
            weaponClass: gun.weaponClass,
            enemy: true,
          });
        }
      }
      if (e.skillCool <= 0) {
        e.skillCool = e.boss ? 6 : 9;
        if (e.boss?.skill === "charge" || role === "grenade") {
          e.telegraph = { x: p.x, y: p.y, time: 1.3 };
          this.notify(
            e.boss ? "零号缅因正在蓄力 · 翻滚躲避" : "手雷落点已标记",
          );
        }
        if (e.boss?.skill === "shield") e.shield = 3;
        if (e.boss?.skill === "dash")
          this.moveActor(e, -Math.sin(e.angle) * 140, Math.cos(e.angle) * 140);
        if (e.boss?.skill === "reinforce" && this.enemies.length < 20)
          this.spawn(e.x - 90, e.y + 75, 3, 3);
        if (
          e.boss?.skill === "turret" &&
          this.enemies.filter((x) => x.turret).length < 3
        ) {
          const t = this.spawn(e.x - 130 + this.random() * 260, e.y + 85, 6, 3);
          t.turret = true;
          t.hp = t.maxHp = 90;
          this.notify("博士部署自动炮塔 · 优先摧毁");
        }
        if (role === "medic") {
          for (const ally of this.enemies)
            if (Math.hypot(ally.x - e.x, ally.y - e.y) < 180)
              ally.hp = Math.min(ally.maxHp, ally.hp + 25);
          this.emit(e.x, e.y - 20, 8, "#a0d7ab");
        }
      }
      if (e.boss && e.hp < e.maxHp * 0.5 && !e.phase) {
        e.phase = 1;
        e.skillCool = 0.5;
        this.notify(`${e.boss.name} · 进入第二阶段`);
        this.sound.play("alert");
      }
    }
    if (e.turret || e.telegraph) return;
    let target = e.target;
    const desired =
      role === "sniper" ? 500 : role === "heavy" ? 210 : e.boss ? 250 : 260;
    if (e.state === "patrol") {
      if (!target || Math.hypot(target.x - e.x, target.y - e.y) < 25)
        e.target = {
          x: e.homeX + (this.random() - 0.5) * 150,
          y: e.homeY + (this.random() - 0.5) * 100,
        };
      target = e.target;
    }
    if (target) {
      let tx = target.x,
        ty = target.y;
      if (e.state === "combat" && canSee) {
        if (d < desired - 60) {
          tx = e.x - Math.cos(e.angle) * 100;
          ty = e.y - Math.sin(e.angle) * 100;
        } else if (d < desired + 30) {
          if (role === "flank" || role === "elite") {
            tx = e.x - Math.sin(e.angle) * 80;
            ty = e.y + Math.cos(e.angle) * 80;
          } else return;
        }
      }
      if (e.leash) {
        tx = Math.max(
          e.leash.x - e.leash.w / 2,
          Math.min(e.leash.x + e.leash.w / 2, tx),
        );
        ty = Math.max(
          e.leash.y - e.leash.h / 2,
          Math.min(e.leash.y + e.leash.h / 2, ty),
        );
      }
      if (
        !this.lineClear(e.x, e.y, tx, ty) ||
        (this.map === 0 && !villageTravelClear(this, e.x, e.y, tx, ty))
      ) {
        if (e.pathTime <= 0) {
          this.route(e, tx, ty);
          e.pathTime = 1 + this.random() * 0.5;
        }
        const next = e.path?.[0];
        if (next) {
          tx = next.x;
          ty = next.y;
          if (Math.hypot(e.x - tx, e.y - ty) < 22) e.path!.shift();
        } else return;
      }
      const a = Math.atan2(ty - e.y, tx - e.x),
        speed =
          e.state === "patrol"
            ? 28
            : role === "heavy"
              ? 48
              : role === "flank" || role === "assault"
                ? 84
                : 62;
      e.walk += dt * 9;
      if (e.state !== "combat") e.angle = a;
      this.moveActor(e, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
    }
  }
}
