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
} from "./store";
import { Sound } from "./audio";
export interface Rect {
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
}
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
    stamina: 160,
    angle: 0,
    walk: 0,
    roll: 0,
    rollCooldown: 0,
    rollX: 0,
    rollY: 0,
    regen: 0,
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
  floating: Floating[] = [];
  time = 900;
  elapsed = 0;
  paused = false;
  sprintToggled = false;
  done = false;
  activeWeapon: "primary" | "secondary" = "primary";
  magazines: Record<string, number> = {};
  magazineTiers: Record<string, number> = {};
  ammoTier = 1;
  reload = 0;
  fireCool = 0;
  heal = 0;
  healItem = "";
  healDuration = 0;
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
    save.pendingMap = map;
    for (const slot of ["primary", "secondary"] as const) {
      const i = save.equipment[slot];
      if (i) this.magazines[i.uid] = 0;
    }
    this.ammoTier = Math.max(
      1,
      ...save.pack
        .filter((i) => db[i.id].kind === "ammo")
        .map((i) => db[i.id].tier),
    );
    this.build();
    this.loadMagazine(true);
    this.sound.mode = "raid";
  }
  get weaponItem() {
    return this.save.equipment[this.activeWeapon];
  }
  get weapon() {
    return this.weaponItem ? db[this.weaponItem.id] : undefined;
  }
  get mag() {
    return this.weaponItem ? this.magazines[this.weaponItem.uid] || 0 : 0;
  }
  set mag(v: number) {
    if (this.weaponItem) this.magazines[this.weaponItem.uid] = v;
  }
  get reserve() {
    return this.save.pack
      .filter((i) => i.id === `m${this.ammoTier}`)
      .reduce((n, i) => n + i.qty, 0);
  }
  build() {
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
                  : "box";
      const high = ["safe", "weapon", "bed"].includes(type);
      const entries = Array.from({ length: high ? 3 : 2 }, () =>
        loot(this.random, m, high),
      );
      if (type === "weapon")
        entries[0] = makeItem(
          `w${Math.min(11, Math.floor(this.random() * (4 + m * 2)))}`,
        );
      if (type === "medical")
        entries[0] = makeItem(`f${1 + Math.floor(this.random() * 3)}`);
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
        active: this.random() > 0.5,
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
    return { x: 1100, y: 1600 };
  }
  spawn(x: number, y: number, breed: number, tier: number, boss?: BossDef) {
    ({ x, y } = this.freePoint(x, y));
    const hp = boss?.hp ?? 55 + tier * 17;
    const weapon =
      boss?.weapon ??
      (breed === 10
        ? 9
        : breed === 14
          ? 7
          : breed === 7
            ? 2
            : Math.min(11, tier < 2 ? 0 : tier + 1));
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
      this.walls.some(
        (w) =>
          Math.abs(x - w.x) < w.w / 2 + r && Math.abs(y - w.y) < w.h / 2 + r,
      )
    );
  }
  moveActor(actor: { x: number; y: number }, dx: number, dy: number) {
    if (!this.blocked(actor.x + dx, actor.y)) actor.x += dx;
    if (!this.blocked(actor.x, actor.y + dy)) actor.y += dy;
  }
  lineClear(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay),
      n = Math.ceil(d / 15);
    for (let i = 1; i < n; i++) {
      const x = ax + ((bx - ax) * i) / n,
        y = ay + ((by - ay) * i) / n;
      if (
        this.walls.some(
          (w) =>
            Math.abs(x - w.x) < w.w / 2 + 2 && Math.abs(y - w.y) < w.h / 2 + 2,
        )
      )
        return false;
    }
    return true;
  }
  // Grid navigation runs only when a direct path is obstructed; max 30x23 nodes.
  route(e: Enemy, tx: number, ty: number) {
    const cell = 80,
      cols = 30,
      rows = 23,
      start = [Math.floor(e.x / cell), Math.floor(e.y / cell)],
      goal = [Math.floor(tx / cell), Math.floor(ty / cell)],
      queue = [start],
      seen = new Map<string, string>();
    const k = (x: number, y: number) => `${x},${y}`;
    seen.set(k(...(start as [number, number])), "");
    let found = "";
    for (let n = 0; n < queue.length && n < 700; n++) {
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
          this.blocked(nx * cell + 40, ny * cell + 40, 19)
        )
          continue;
        seen.set(key, k(x, y));
        queue.push([nx, ny]);
      }
    }
    const out: { x: number; y: number }[] = [];
    while (found && seen.get(found)) {
      const [x, y] = found.split(",").map(Number);
      out.unshift({ x: x * cell + 40, y: y * cell + 40 });
      found = seen.get(found)!;
    }
    e.path = out;
  }
  interrupt(cancelHeal = true) {
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
    if (!this.weapon || this.reload || this.mag >= this.weapon.mag!) return;
    if (!this.reserve) {
      this.notify("没有对应等级的备弹 · 在背包切换弹药");
      return;
    }
    if (instant) this.finishReload();
    else {
      this.interrupt();
      this.reload = this.weapon.reload!;
      this.sound.play("reload");
    }
  }
  finishReload() {
    this.reload = 0;
    if (!this.weapon) return;
    let count = Math.min(this.weapon.mag! - this.mag, this.reserve);
    this.mag += count;
    this.magazineTiers[this.weaponItem!.uid] = this.ammoTier;
    for (const i of this.save.pack) {
      if (i.id === `m${this.ammoTier}` && count > 0) {
        const used = Math.min(count, i.qty);
        i.qty -= used;
        count -= used;
      }
    }
    this.save.pack = this.save.pack.filter((i) => i.qty > 0);
    this.syncLoaded();
    persist(this.save);
    this.onChange();
  }
  switchWeapon() {
    if (this.save.equipment.secondary) {
      this.activeWeapon =
        this.activeWeapon === "primary" ? "secondary" : "primary";
      this.ammoTier = this.magazineTiers[this.weaponItem!.uid] ?? this.ammoTier;
      this.reload = 0;
      this.interrupt();
      this.onChange();
    }
  }
  equipLoot(uid: string) {
    const item = this.save.pack.find((i) => i.uid === uid);
    if (!item) return false;
    if (db[item.id].kind !== "weapon") return equip(this.save, "pack", uid);
    const old = this.save.equipment.secondary;
    const simulated = structuredClone(this.save.pack);
    let count = old ? (this.magazines[old.uid] ?? 0) : 0;
    while (count > 0) {
      const n = Math.min(count, 30);
      if (
        !put(
          simulated,
          makeItem(`m${this.magazineTiers[old!.uid] ?? this.ammoTier}`, n),
          packCapacity(this.save),
        )
      )
        return false;
      count -= n;
    }
    this.save.pack = simulated;
    if (old) this.magazines[old.uid] = 0;
    const okay = equip(this.save, "pack", uid, true);
    if (okay) {
      this.magazines[item.uid] ??= 0;
      this.magazineTiers[item.uid] ??= this.ammoTier;
      this.syncLoaded();
      persist(this.save);
    }
    return okay;
  }
  switchAmmo(tier: number) {
    if (tier === this.ammoTier || tier < 1 || tier > 4) return;
    const simulated = structuredClone(this.save.pack);
    let left = this.mag;
    while (left) {
      const n = Math.min(30, left),
        item = makeItem(`m${this.ammoTier}`, n);
      if (!put(simulated, item, packCapacity(this.save))) {
        this.notify("背包空间不足，无法卸下当前弹匣");
        return;
      }
      left -= n;
    }
    this.save.pack = simulated;
    this.mag = 0;
    this.ammoTier = tier;
    this.magazineTiers[this.weaponItem!.uid] = tier;
    this.syncLoaded();
    this.reload = 0;
    this.loadMagazine();
    persist(this.save);
    this.onChange();
  }
  roll(dx: number, dy: number) {
    if (this.p.stamina < 28 || this.p.rollCooldown > 0 || this.p.roll) return;
    this.interrupt();
    this.p.stamina -= 28;
    this.p.regen = 0.8;
    this.p.roll = 0.35;
    this.p.rollCooldown = 0.6;
    const l = Math.hypot(dx, dy);
    this.p.rollX = l ? dx / l : Math.cos(this.p.angle);
    this.p.rollY = l ? dy / l : Math.sin(this.p.angle);
    this.sound.play("roll");
  }
  useFood(uid?: string) {
    if (this.heal || this.p.hp >= 100) return;
    const food = uid
      ? this.save.pack.find((i) => i.uid === uid && db[i.id].kind === "food")
      : this.save.pack
          .filter((i) => db[i.id].kind === "food")
          .sort((a, b) => db[a.id].heal! - db[b.id].heal!)[0];
    if (!food) {
      this.notify("没有食物 · 搜索医疗箱或回基地购买");
      return;
    }
    this.healItem = food.uid;
    this.healDuration = db[food.id].useTime!;
    this.heal = this.healDuration;
    this.search = undefined;
    this.onChange();
  }
  shoot() {
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
    this.interrupt();
    this.mag--;
    this.syncLoaded();
    this.fireCool = 60 / this.weapon.rpm!;
    const a = this.p.angle + (this.random() - 0.5) * this.weapon.spread! * 2;
    this.addBullet(
      this.p.x,
      this.p.y - 24,
      a,
      true,
      this.weapon.damage!,
      this.ammoTier,
      this.weapon.range!,
    );
    this.sound.play("shot");
    this.shake = Math.max(this.shake, this.weapon.damage! > 60 ? 5 : 2);
    this.emit(
      this.p.x + Math.cos(a) * 44,
      this.p.y - 24 + Math.sin(a) * 44,
      5,
      "#ffe4a4",
    );
    this.alert(this.p.x, this.p.y, 420);
  }
  syncLoaded() {
    this.save.loadedRounds = (["primary", "secondary"] as const).flatMap(
      (slot) => {
        const w = this.save.equipment[slot];
        return w
          ? [
              {
                weapon: w.uid,
                tier: this.magazineTiers[w.uid] ?? this.ammoTier,
                count: this.magazines[w.uid] ?? 0,
              },
            ]
          : [];
      },
    );
  }
  addBullet(
    x: number,
    y: number,
    a: number,
    friendly: boolean,
    dmg: number,
    tier: number,
    range = 800,
  ) {
    const speed = friendly ? 1050 : 440;
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
      this.interrupt();
      return;
    }
    const c = this.containers
      .filter(
        (c) =>
          Math.hypot(c.x - this.p.x, c.y - this.p.y) < 90 &&
          this.lineClear(this.p.x, this.p.y, c.x, c.y) &&
          c.items.length,
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
      (e) => e.active && Math.hypot(e.x - this.p.x, e.y - this.p.y) < 85,
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
      this.notify("撤离已启动 · 留在圈内 5 秒");
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
    this.search = c;
    this.searchProgress = 0;
    this.stats.searches += c.open ? 0 : 1;
    c.open = true;
    this.inventory = true;
    this.sound.play("search");
  }
  take(index: number, safe = false) {
    const c = this.search;
    if (!c || index >= c.revealed) return;
    const i = c.items[index],
      target = safe ? this.save.secure : this.save.pack,
      cap = safe ? [1, 2, 4, 6][this.save.safe] : packCapacity(this.save);
    if (!canPut(target, i, cap)) {
      this.notify(safe ? "安全箱已满" : "背包已满 · 丢弃物品或更换背包");
      return;
    }
    put(target, i, cap);
    if (db[i.id].kind === "collectible" && !this.save.collection.includes(i.id))
      this.save.collection.push(i.id);
    this.value += Math.floor(
      db[i.id].price * 0.65 * (db[i.id].kind === "ammo" ? i.qty / 30 : 1),
    );
    c.items.splice(index, 1);
    c.revealed--;
    persist(this.save);
    this.sound.play("click");
    this.onChange();
  }
  hurtPlayer(dmg: number, tier: number, head = false) {
    if (this.done) return;
    this.interrupt();
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
    const head = b.y < e.y - 34;
    let d = damage(
      b.damage,
      b.tier,
      e.tier,
      head ? e.helmetDurability : e.armorDurability,
      head,
      Math.max(0.45, 1 - (b.travel / b.range) * 0.3),
    );
    if (e.shield > 0) d *= 0.35;
    if (head)
      e.helmetDurability = Math.max(0, e.helmetDurability - b.damage * 0.25);
    else e.armorDurability = Math.max(0, e.armorDurability - b.damage * 0.25);
    e.hp -= d;
    this.stats.damageDealt += d;
    e.hit = 0.12;
    e.alert = 6;
    e.state = "combat";
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
      makeItem(`m${Math.min(4, e.tier)}`, 20),
    ];
    items[1].durability = e.armorDurability;
    items[2].durability = e.helmetDurability;
    for (let n = 0; n < (e.boss ? 3 : Math.floor(this.random() * 3)); n++)
      items.push(loot(this.random, this.map, !!e.boss));
    this.containers.push({
      x: e.x,
      y: e.y,
      name: `${e.boss?.name ?? breeds[e.breed].name}的战利品`,
      type: "corpse",
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
    this.interrupt(); // Return loaded rounds: they are real ammunition, not free per-raid magazines.
    for (const slot of ["primary", "secondary"] as const) {
      const w = this.save.equipment[slot];
      let count = w ? this.magazines[w.uid] || 0 : 0;
      while (count > 0) {
        const n = Math.min(30, count),
          i = makeItem(`m${this.magazineTiers[w!.uid] ?? this.ammoTier}`, n);
        if (canPut(this.save.pack, i, packCapacity(this.save)))
          put(this.save.pack, i, packCapacity(this.save));
        else if (success || this.save.mode === "easy")
          this.save.overflow.push(i);
        else this.save.pack.push(i);
        count -= n;
      }
    }
    const result: Result = {
      success,
      reason,
      map: this.map,
      ...this.stats,
      value: this.value,
      time: this.elapsed,
      bosses: success ? this.pendingBosses : [],
      reward: success ? 300 + this.map * 350 : 0,
    };
    settle(this.save, result);
    this.sound.mode = "base";
    this.sound.play(success ? "success" : "death");
    this.onEnd(result);
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
    if (this.time <= 0) {
      this.finish(false, "行动超时，未能撤离");
      return;
    }
    if (this.time < 300 && !this.warning) {
      this.warning = true;
      this.notify("最后 5 分钟 · 立即规划撤离路线");
      this.sound.play("alert");
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance("行动剩余五分钟，请准备撤离");
        u.lang = "zh-CN";
        u.volume = this.save.settings.master * this.save.settings.sfx;
        window.speechSynthesis.speak(u);
      }
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
    this.shake = Math.max(0, this.shake - dt * 20);
    p.regen -= dt;
    const sprint = this.sprintToggled && l > 0 && p.stamina > 0 && !p.exhausted;
    if (l && !this.mapOpen) {
      this.interrupt(false);
      if (sprint) {
        if (this.heal > 0) this.interrupt();
        p.stamina = Math.max(0, p.stamina - dt * 10);
        p.regen = 0.8;
        if (p.stamina <= 0) {
          p.exhausted = true;
          this.sprintToggled = false;
        }
      }
      this.moveActor(
        p,
        dx * (sprint ? 220 : 140) * dt,
        dy * (sprint ? 220 : 140) * dt,
      );
      p.walk += dt * (sprint ? 15 : 10);
    } else p.walk = 0;
    if (p.roll > 0) {
      p.roll = Math.max(0, p.roll - dt);
      this.moveActor(p, p.rollX * 390 * dt, p.rollY * 390 * dt);
    } else if (p.regen <= 0) p.stamina = Math.min(160, p.stamina + 24 * dt);
    if (p.stamina >= 25) p.exhausted = false;
    if (mouse.down) this.shoot();
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) this.finishReload();
    }
    if (this.heal > 0) {
      this.heal -= dt;
      if (this.heal <= 0) {
        this.heal = 0;
        const food = this.save.pack.find((i) => i.uid === this.healItem);
        if (food) {
          p.hp = Math.min(100, p.hp + db[food.id].heal!);
          this.save.pack = this.save.pack.filter((i) => i !== food);
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
          if (db[item.id].tier >= 4) {
            this.notify(
              `发现${db[item.id].tier === 5 ? "传说" : "稀世"}物品 · ${db[item.id].name}`,
            );
            this.emit(c.x, c.y - 20, 25, colors[db[item.id].tier]);
          }
          this.onChange();
        }
      }
    }
    this.near = this.containers.find(
      (c) => c.items.length && Math.hypot(c.x - p.x, c.y - p.y) < 85,
    );
    this.exit = this.exits.find(
      (e) => e.active && Math.hypot(e.x - p.x, e.y - p.y) < 65,
    );
    if (this.exit && (!this.exit.paid || this.exit.bought)) {
      this.extract += dt;
      if (this.extract >= 5) {
        this.finish(true, "成功撤离");
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
        if (
          this.walls.some(
            (w) =>
              Math.abs(b.x - w.x) < w.w / 2 + 2 &&
              Math.abs(b.y + 20 - w.y) < w.h / 2 + 2,
          )
        ) {
          b.life = 0;
          this.emit(b.x, b.y, 3, "#afbc99");
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
          this.hurtPlayer(b.damage, b.tier, b.y < p.y - 34);
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
      e.state = "combat";
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
      if (e.cool <= 0 && e.reload <= 0 && !e.telegraph) {
        if (!e.mag) {
          e.reload = 2;
        } else {
          const shots = e.boss?.skill === "shotgun" ? 5 : 1;
          for (let i = 0; i < shots; i++)
            this.addBullet(
              e.x,
              e.y - 24,
              e.angle +
                (this.random() - 0.5) *
                  (e.boss?.skill === "shotgun"
                    ? 0.55
                    : 0.15 + 0.04 * (5 - e.tier)),
              false,
              e.boss ? 14 + this.map * 2 : 8 + this.map * 2,
              Math.min(4, e.tier),
            );
          e.mag--;
          e.cool =
            e.boss?.skill === "shotgun"
              ? 1.5
              : e.boss?.skill === "turret"
                ? 0.7
                : e.boss?.skill === "shield"
                  ? 0.25
                  : role === "sniper"
                    ? 1.7
                    : 0.65 + this.random() * 0.65;
          this.sound.play("enemy");
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
      if (!this.lineClear(e.x, e.y, tx, ty)) {
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
