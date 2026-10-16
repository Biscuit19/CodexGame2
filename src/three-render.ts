import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { breeds, maps } from "./data";
import type { Raid, Enemy, Container } from "./raid";
import { Renderer } from "./render";
import { text, round } from "./art";

type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group;
  gun: THREE.Group;
  helmet: THREE.Group;
  vest: THREE.Mesh;
  pack: THREE.Group;
};
const materials = new Map<string, THREE.MeshStandardMaterial>();
const material = (color: string) => {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0.03,
    });
    materials.set(color, m);
  }
  return m;
};
const sphere = new THREE.SphereGeometry(1, 12, 10);
// Merge only direct, static children. Articulated limbs remain separate groups.
function batchStatic(parent: THREE.Group) {
  const groups = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...parent.children]) {
    if (
      !(child instanceof THREE.Mesh) ||
      !(child.material instanceof THREE.MeshStandardMaterial) ||
      child.material.transparent ||
      child.material.map
    )
      continue;
    const list = groups.get(child.material) || [];
    list.push(child);
    groups.set(child.material, list);
  }
  for (const [mat, list] of groups) {
    if (list.length < 2) continue;
    const geometries = list.map((m) => {
      m.updateMatrix();
      return m.geometry.clone().applyMatrix4(m.matrix).toNonIndexed();
    });
    const combined = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!combined) continue;
    list.forEach((m) => parent.remove(m));
    const merged = new THREE.Mesh(combined, mat);
    merged.castShadow = list.some((m) => m.castShadow);
    merged.receiveShadow = true;
    parent.add(merged);
  }
}
const contactShadow = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
  gradient.addColorStop(0, "rgba(27,43,25,.42)");
  gradient.addColorStop(1, "rgba(27,43,25,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  });
})();
function release(group: THREE.Object3D) {
  const cached = new Set([sphere, ...rounded.values()]);
  const shared = new Set<THREE.Material>([
    contactShadow,
    ...materials.values(),
  ]);
  const geometries = new Set<THREE.BufferGeometry>(),
    mats = new Set<THREE.Material>();
  group.traverse((o) => {
    if (!(o instanceof THREE.Mesh || o instanceof THREE.Line)) return;
    if (!cached.has(o.geometry)) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (!shared.has(m)) mats.add(m);
  });
  geometries.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
}
const rounded = new Map<string, THREE.BufferGeometry>();
function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
) {
  const m = new THREE.Mesh(geometry, material(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function ball(
  p: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const m = mesh(p, sphere, color, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function block(
  p: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  r = 2,
) {
  const key = `${w},${h},${d},${r}`;
  if (!rounded.has(key))
    rounded.set(key, new RoundedBoxGeometry(w, h, d, 2, r));
  return mesh(p, rounded.get(key)!, color, x, y, z);
}
function cylinder(
  p: THREE.Object3D,
  color: string,
  x: number,
  y: number,
  z: number,
  rt: number,
  rb: number,
  h: number,
) {
  return mesh(p, new THREE.CylinderGeometry(rt, rb, h, 12), color, x, y, z);
}
function makeCat(breed = -2, boss = false): Rig {
  const b =
    breed === -2
      ? { fur: "#e8cb9e", patch: "#b67f4b", eye: "#81a671" }
      : breed === -1
        ? { fur: "#e1b3a7", patch: "#c28d84", eye: "#98bec1" }
        : breeds[breed];
  const root = new THREE.Group(),
    body = new THREE.Group(),
    head = new THREE.Group(),
    tail = new THREE.Group(),
    gun = new THREE.Group(),
    helmet = new THREE.Group(),
    pack = new THREE.Group();
  root.add(body);
  body.position.y = 5;
  ball(body, b.fur, 0, 25, 0, 17, 23, 13);
  const vest = block(body, "#536c4e", 0, 28, 1, 31, 30, 26, 8);
  block(body, "#879368", -8, 25, 15, 11, 12, 5, 2);
  block(body, "#8a9267", 8, 25, 15, 11, 12, 5, 2);
  block(body, "#c1b17d", 0, 37, 15, 5, 6, 3, 1);
  body.add(pack);
  block(pack, "#717958", 0, 27, -16, 25, 29, 13, 5);
  block(pack, "#a3a77b", 0, 27, -24, 18, 12, 4, 2);
  block(pack, "#3b5140", 0, 39, -20, 13, 3, 5, 1);
  const legs = [new THREE.Group(), new THREE.Group()];
  legs.forEach((leg, i) => {
    leg.position.set(i ? 9 : -9, 13, 0);
    body.add(leg);
    ball(leg, b.fur, 0, -6, 0, 7, 11, 7);
    ball(leg, "#404e3b", 0, -12, 4, 8, 5, 10);
  });
  head.position.set(0, 53, 1);
  body.add(head);
  ball(head, b.fur, 0, 0, 0, 23, 20, 19);
  if (breed === -2) {
    ball(head, "#776452", -12, 5, -1, 12, 15, 13);
    ball(head, b.patch, 11, 8, 2, 10, 12, 16);
  }
  if ([1, 3, 7].includes(breed)) {
    for (let i = -1; i <= 1; i++) {
      const stripe = block(head, b.patch, i * 7, 17, 5, 3, 2, 18, 1);
      stripe.rotation.x = 0.3;
    }
  }
  if (breed === 4) {
    ball(head, b.patch, 0, -1, 12, 18, 14, 9);
  }
  const longFur = [10, 13, 14].includes(breed);
  if (longFur) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ball(head, b.fur, Math.sin(a) * 19, Math.cos(a) * 14, -2, 8, 9, 12);
    }
    ball(body, b.fur, 0, 42, 5, 21, 11, 17);
  }
  const earHeight = breed === 5 ? 25 : breed === 4 ? 21 : 18;
  [-1, 1].forEach((side) => {
    const ear = mesh(
      head,
      new THREE.ConeGeometry(10, earHeight, 3),
      b.fur,
      side * 15,
      19,
      0,
    );
    ear.rotation.y = Math.PI / 2;
    ear.rotation.z = -side * 0.16;
    const inner = mesh(
      head,
      new THREE.ConeGeometry(6, earHeight * 0.7, 3),
      "#ce9e98",
      side * 15,
      20,
      4,
    );
    inner.rotation.y = Math.PI / 2;
    inner.rotation.z = -side * 0.16;
    if (breed === 14) {
      const tuft = mesh(
        head,
        new THREE.ConeGeometry(3, 11, 3),
        b.patch,
        side * 17,
        31,
        0,
      );
      tuft.rotation.z = -side * 0.2;
    }
    ball(head, "#f2e2c6", side * 7, -7, 16, 10, 7, 6);
    ball(head, b.eye, side * 9, 2, 17, 5, 6, 2.5);
    ball(head, "#23352e", side * 9, 2, 19, 2, 4.5, 1);
    ball(head, "#ffffff", side * 9 - 1, 4, 19.9, 1.3, 1.5, 0.6);
    const whisker = new THREE.LineBasicMaterial({ color: "#625f4b" });
    for (let i = 0; i < 2; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(side * 11, -7 - i * 3, 19),
        new THREE.Vector3(side * 29, -5 - i * 7, 17),
      ]);
      head.add(new THREE.Line(geo, whisker));
    }
  });
  ball(head, "#a66e6d", 0, -5, 21, 3.1, 2.2, 1.8);
  ball(head, "#6c6854", 0, -10, 21, 1, 2, 0.6);
  head.add(helmet);
  const cap = ball(helmet, "#526c4b", 0, 13, -1, 24, 13, 20);
  cap.scale.y = 9;
  block(helmet, "#849366", 0, 13, 15, 43, 5, 11, 2);
  block(helmet, "#d7c18b", 0, 19, 20, 9, 8, 2, 1);
  helmet.visible = breed !== -1;
  tail.position.set(0, 20, -10);
  body.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-15, -1, -12),
    new THREE.Vector3(-27, 8, -13),
    new THREE.Vector3(-23, 20, -10),
  ]);
  mesh(
    tail,
    new THREE.TubeGeometry(curve, 14, 4.3, 7, false),
    b.patch,
    0,
    0,
    0,
  );
  ball(tail, b.fur, -23, 20, -10, 4.5, 4.5, 4.5);
  gun.position.set(10, 31, 14);
  body.add(gun);
  block(gun, "#334941", 0, 0, 9, 8, 8, 30, 2);
  block(gun, "#929475", 0, 1, 3, 9, 7, 15, 2);
  block(gun, "#3c4c42", 0, -7, 3, 5, 9, 8, 1);
  const barrel = cylinder(gun, "#2e3f3a", 0, 0, 30, 2.1, 2.1, 19);
  barrel.rotation.x = Math.PI / 2;
  block(gun, "#b6a480", 0, 5, 10, 4, 2, 7, 1);
  ball(body, b.fur, 16, 29, 15, 5.5, 6, 6);
  ball(body, b.fur, 4, 30, 23, 5, 5, 5);
  if (boss) root.scale.setScalar(breed === 14 ? 1.5 : 1.22);
  [head, helmet, pack, gun].forEach(batchStatic);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 50), contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 1;
  root.add(shadow);
  return { root, body, head, legs, tail, gun, helmet, vest, pack };
}

/** Map one uses real geometry, orthographic projection, light and articulated models. */
export class ThreeRenderer {
  canvas: HTMLCanvasElement;
  webgl: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera();
  world = new THREE.Group();
  actors = new Map<string, Rig>();
  containers = new Map<Container, { group: THREE.Group; lid: THREE.Group }>();
  wallMeshes: { mesh: THREE.Mesh; rect: Raid["walls"][number] }[] = [];
  seed = 0;
  width = 0;
  height = 0;
  zoom = 1.18;
  ray = new THREE.Raycaster();
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -28);
  target = new THREE.Vector3();
  texture?: THREE.CanvasTexture;
  bulletLines: THREE.LineSegments;
  bulletPositions = new Float32Array(600 * 6);
  particlePoints: THREE.Points;
  particlePositions = new Float32Array(1000 * 3);
  particleColors = new Float32Array(1000 * 3);
  exitRings: THREE.Mesh[] = [];
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.id = "scene3d";
    this.canvas.setAttribute("aria-label", "地图一立体场景");
    document.body.insertBefore(this.canvas, document.querySelector("#world"));
    this.webgl = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    const gl = this.webgl.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const software =
      debug &&
      /swiftshader|llvmpipe|software/i.test(
        gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
      );
    this.webgl.setPixelRatio(software ? 0.7 : Math.min(1.5, devicePixelRatio));
    this.webgl.shadowMap.enabled = !software;
    this.webgl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webgl.shadowMap.autoUpdate = false;
    this.webgl.outputColorSpace = THREE.SRGBColorSpace;
    this.webgl.toneMapping = THREE.ACESFilmicToneMapping;
    this.webgl.toneMappingExposure = 1.25;
    this.scene.background = new THREE.Color("#9eac87");
    this.scene.add(new THREE.HemisphereLight("#fbf5da", "#6f856d", 2.1));
    const sun = new THREE.DirectionalLight("#fff2cb", 2.6);
    sun.position.set(450, 1200, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -1550;
    sun.shadow.camera.right = 1550;
    sun.shadow.camera.top = 1450;
    sun.shadow.camera.bottom = -1450;
    sun.shadow.camera.far = 3500;
    sun.shadow.normalBias = 1.5;
    sun.target.position.set(1200, 0, 900);
    this.scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight("#dcead8", 0.5);
    fill.position.set(-800, 400, 1200);
    this.scene.add(fill);
    this.scene.add(this.world);
    const bg = new THREE.BufferGeometry();
    bg.setAttribute(
      "position",
      new THREE.BufferAttribute(this.bulletPositions, 3),
    );
    this.bulletLines = new THREE.LineSegments(
      bg,
      new THREE.LineBasicMaterial({ color: "#fff0b0" }),
    );
    this.scene.add(this.bulletLines);
    // Positions change outside the initial zero-filled bounds every frame.
    this.bulletLines.frustumCulled = false;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute(
      "position",
      new THREE.BufferAttribute(this.particlePositions, 3),
    );
    pg.setAttribute("color", new THREE.BufferAttribute(this.particleColors, 3));
    this.particlePoints = new THREE.Points(
      pg,
      new THREE.PointsMaterial({
        size: 4,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.scene.add(this.particlePoints);
    this.particlePoints.frustumCulled = false;
    this.resize();
  }
  resize() {
    if (innerWidth === this.width && innerHeight === this.height) return;
    this.width = innerWidth;
    this.height = innerHeight;
    this.zoom = Math.max(0.9, Math.min(1.3, this.width / 1250));
    this.webgl.setSize(this.width, this.height);
    this.camera.left = -this.width / 2 / this.zoom;
    this.camera.right = this.width / 2 / this.zoom;
    this.camera.top = this.height / 2 / this.zoom;
    this.camera.bottom = -this.height / 2 / this.zoom;
    this.camera.near = 1;
    this.camera.far = 4000;
    this.camera.updateProjectionMatrix();
  }
  show(value: boolean) {
    this.canvas.classList.toggle("hidden", !value);
  }
  screenToWorld(x: number, y: number) {
    this.ray.setFromCamera(
      new THREE.Vector2((x / this.width) * 2 - 1, 1 - (y / this.height) * 2),
      this.camera,
    );
    this.ray.ray.intersectPlane(this.plane, this.target);
    return { x: this.target.x, y: this.target.z - 24 };
  }
  project(x: number, y: number, z = 35) {
    const p = new THREE.Vector3(x, z, y).project(this.camera);
    return {
      x: ((p.x + 1) * this.width) / 2,
      y: ((1 - p.y) * this.height) / 2,
    };
  }
  prepare(r: Raid, flat: Renderer) {
    if (this.seed === r.seed) return;
    this.seed = r.seed;
    release(this.world);
    this.world.clear();
    this.actors.clear();
    this.containers.clear();
    this.wallMeshes = [];
    this.exitRings = [];
    this.texture?.dispose();
    flat.prepare(r);
    this.texture = new THREE.CanvasTexture(flat.ground!);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = this.webgl.capabilities.getMaxAnisotropy();
    const ground = mesh(
      this.world,
      new THREE.PlaneGeometry(r.width, r.height),
      "#ffffff",
      1200,
      -0.5,
      900,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 1,
    });
    ground.receiveShadow = true;
    ground.castShadow = false;
    for (const w of r.walls) {
      if (w.type === "wall") {
        const wall = block(
          this.world,
          "#a9ac8c",
          w.x,
          w.z * 0.5,
          w.y,
          w.w,
          w.z,
          w.h,
          2,
        );
        this.wallMeshes.push({ mesh: wall, rect: w });
        wall.material = (wall.material as THREE.MeshStandardMaterial).clone();
        (wall.material as THREE.MeshStandardMaterial).transparent = true;
        block(this.world, "#cfccad", w.x, w.z + 1, w.y, w.w + 4, 5, w.h + 4, 1);
        if (w.w > 100)
          for (let i = 0; i < Math.floor(w.w / 75); i++)
            block(
              this.world,
              "#8f9677",
              w.x - w.w * 0.5 + 30 + i * 75,
              w.z * 0.5,
              w.y + w.h * 0.5 + 1,
              4,
              w.z - 8,
              2,
              1,
            );
      } else if (w.type === "barrel") {
        for (let k = -1; k <= 1; k++) {
          cylinder(this.world, "#718771", w.x + k * 23, 20, w.y, 12, 12, 40);
          cylinder(this.world, "#aab49a", w.x + k * 23, 39, w.y, 12.8, 12.8, 3);
          cylinder(this.world, "#495d4b", w.x + k * 23, 22, w.y, 12.8, 12.8, 2);
        }
      } else {
        block(this.world, "#a39b74", w.x, w.z / 2, w.y, w.w, w.z, w.h, 2);
        for (const side of [-1, 1])
          block(
            this.world,
            "#c9ba8a",
            w.x + side * (w.w * 0.5 - 8),
            w.z / 2,
            w.y + w.h * 0.5 + 1,
            8,
            w.z,
            3,
            1,
          );
        block(
          this.world,
          "#7a815d",
          w.x,
          w.z * 0.5,
          w.y + w.h * 0.5 + 2,
          w.w - 10,
          4,
          4,
          1,
        );
      }
    }
    // Factory dressing shares collision footprints; small details add depth without changing routes.
    for (const [x, z] of [
      [650, 560],
      [1700, 510],
      [690, 1280],
      [1720, 1260],
    ]) {
      block(this.world, "#6a7d67", x + 50, 8, z - 90, 130, 16, 35, 3);
      for (let i = 0; i < 3; i++)
        cylinder(
          this.world,
          "#c6c5a2",
          x + 10 + i * 35,
          22,
          z - 90,
          11,
          11,
          16,
        );
    }
    for (let i = 0; i < 34; i++) {
      const side = i % 4,
        x = side === 0 ? 90 : side === 1 ? 2300 : 120 + ((i * 113) % 2140),
        z = side === 2 ? 90 : side === 3 ? 1710 : 100 + ((i * 137) % 1540);
      cylinder(this.world, "#877b5d", x, 40, z, 8, 11, 80);
      for (let k = 0; k < 3; k++) {
        const crown = mesh(
          this.world,
          new THREE.ConeGeometry(42 - k * 6, 80, 8),
          ["#7e936c", "#6b865f", "#617b56"][k],
          x,
          85 + k * 30,
          z,
        );
        crown.rotation.y = i * 0.8;
      }
    }
    for (const e of r.exits) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(57, 63, 48),
        new THREE.MeshBasicMaterial({
          color: e.active ? "#c2dfab" : "#667a65",
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(e.x, 1, e.y);
      this.world.add(ring);
      this.exitRings.push(ring);
    }
    batchStatic(this.world);
    this.webgl.shadowMap.needsUpdate = true;
    const player = makeCat();
    this.actors.set("player", player);
    this.world.add(player.root);
  }
  container(c: Container) {
    const group = new THREE.Group(),
      lid = new THREE.Group();
    group.position.set(c.x, 0, c.y);
    const color =
      c.type === "safe"
        ? "#6f8479"
        : c.type === "medical"
          ? "#d2d6b8"
          : c.type === "weapon"
            ? "#5d7554"
            : c.type === "corpse"
              ? "#7e815d"
              : "#b29f71";
    const w = c.type === "weapon" ? 60 : c.type === "safe" ? 42 : 44,
      h = c.type === "safe" ? 42 : c.type === "corpse" ? 20 : 27;
    block(group, color, 0, h / 2, 0, w, h, 30, 3);
    lid.position.set(0, h, -15);
    group.add(lid);
    block(
      lid,
      c.type === "safe" ? "#8c9e8a" : color,
      0,
      1,
      15,
      w + 2,
      5,
      32,
      2,
    );
    if (c.type === "safe") {
      const wheel = cylinder(group, "#dbc18b", 0, 20, 17, 7, 7, 3);
      wheel.rotation.x = Math.PI / 2;
      block(group, "#e5cf98", 0, 20, 20, 3, 12, 2, 1);
    } else if (c.type === "medical") {
      block(group, "#80976c", 0, 13, 16, 17, 5, 2, 1);
      block(group, "#80976c", 0, 13, 17, 5, 15, 2, 1);
    } else {
      for (const x of [-w * 0.3, w * 0.3])
        block(group, "#d0c194", x, h * 0.5, 16, 4, h + 2, 3, 1);
    }
    this.world.add(group);
    return { group, lid };
  }
  updateRig(
    rig: Rig,
    x: number,
    y: number,
    angle: number,
    walk: number,
    roll = 0,
    helmet = true,
    armor = true,
    bag = true,
  ) {
    rig.root.position.set(x, 0, y);
    rig.root.rotation.y = Math.PI / 2 - angle;
    rig.body.position.y =
      5 +
      (walk
        ? Math.abs(Math.sin(walk)) * 3.8
        : Math.sin(performance.now() / 450) * 0.4);
    rig.body.rotation.z = walk ? Math.sin(walk) * 0.13 : 0;
    rig.head.rotation.z = walk ? -Math.sin(walk) * 0.06 : 0;
    rig.head.rotation.x = Math.sin(walk * 2) * 0.035;
    rig.legs.forEach(
      (leg, i) => (leg.rotation.x = Math.sin(walk + (i ? Math.PI : 0)) * 0.65),
    );
    rig.tail.rotation.y = Math.sin(walk * 0.6 + performance.now() / 900) * 0.22;
    rig.helmet.visible = helmet;
    rig.vest.visible = armor;
    rig.pack.visible = bag;
    if (roll > 0) {
      rig.body.rotation.z = (0.35 - roll) * Math.PI * 4;
      rig.body.position.y = 25;
    }
  }
  render(r: Raid, flat: Renderer) {
    this.resize();
    this.prepare(r, flat);
    this.show(true);
    const px = Math.max(490, Math.min(1920, r.p.x)),
      pz = Math.max(260, Math.min(1520, r.p.y));
    this.camera.position.set(px, 1100, pz + 1000);
    this.camera.lookAt(px, 0, pz - 100);
    const shake = r.shake * r.save.settings.shake;
    this.camera.position.x += Math.sin(r.elapsed * 140) * shake;
    this.camera.position.z += Math.cos(r.elapsed * 180) * shake;
    this.camera.updateMatrixWorld();
    this.updateRig(
      this.actors.get("player")!,
      r.p.x,
      r.p.y,
      r.p.angle,
      r.p.walk,
      r.p.roll,
      !!r.save.equipment.helmet,
      !!r.save.equipment.armor,
      !!r.save.equipment.bag,
    );
    const ids = new Set(["player"]);
    for (const e of r.enemies) {
      ids.add(e.id);
      let rig = this.actors.get(e.id);
      if (!rig) {
        rig = makeCat(e.breed, !!e.boss);
        this.actors.set(e.id, rig);
        this.world.add(rig.root);
      }
      this.updateRig(
        rig,
        e.x,
        e.y,
        e.angle,
        e.walk,
        0,
        e.tier > 1,
        e.tier > 0,
        true,
      );
    }
    for (const [id, rig] of this.actors)
      if (!ids.has(id)) {
        this.world.remove(rig.root);
        release(rig.root);
        this.actors.delete(id);
      }
    for (const c of r.containers) {
      let m = this.containers.get(c);
      if (!m) {
        m = this.container(c);
        this.containers.set(c, m);
      }
      m.group.visible = c.items.length > 0;
      m.lid.rotation.x = c.open ? -0.65 : 0;
    }
    for (const w of this.wallMeshes) {
      const hide =
        w.rect.y > r.p.y &&
        Math.abs(w.rect.x - r.p.x) < w.rect.w * 0.5 + 25 &&
        w.rect.y - r.p.y < 110;
      const m = w.mesh.material as THREE.MeshStandardMaterial;
      m.opacity = hide ? 0.25 : 1;
    }
    let n = 0;
    for (const b of r.bullets.slice(0, 600)) {
      this.bulletPositions.set(
        [b.x, 29, b.y + 24, b.x - b.vx * 0.025, 29, b.y + 24 - b.vy * 0.025],
        n * 6,
      );
      n++;
    }
    this.bulletLines.geometry.setDrawRange(0, n * 2);
    this.bulletLines.geometry.attributes.position.needsUpdate = true;
    let count = 0;
    for (const p of r.particles.slice(0, 1000)) {
      this.particlePositions.set(
        [p.x, 10 + Math.max(0, p.life) * 35, p.y],
        count * 3,
      );
      const col = new THREE.Color(p.color);
      this.particleColors.set([col.r, col.g, col.b], count * 3);
      count++;
    }
    this.particlePoints.geometry.setDrawRange(0, count);
    this.particlePoints.geometry.attributes.position.needsUpdate = true;
    this.particlePoints.geometry.attributes.color.needsUpdate = true;
    this.webgl.render(this.scene, this.camera);
    flat.resize();
    const c = flat.ctx;
    c.clearRect(0, 0, flat.width, flat.height);
    this.drawCombat(r, c);
    for (const e of r.exits) {
      const p = this.project(e.x, e.y, 65);
      text(c, e.name, p.x, p.y, 20, e.active ? "#f4edcf" : "#b5c1aa");
      text(
        c,
        !e.active
          ? "本局关闭"
          : e.paid
            ? e.bought
              ? "撤离已开启"
              : `支付 ${maps[r.map].fee} 金币`
            : "免费撤离",
        p.x,
        p.y + 27,
        20,
        "#dfe6cd",
      );
    }
    for (const e of r.enemies)
      if (e.state === "combat" || e.hit > 0) {
        const p = this.project(e.x, e.y, e.boss ? 118 : 93);
        round(c, p.x - 32, p.y, 64, 6, 3, "#344d3e");
        round(
          c,
          p.x - 32,
          p.y,
          64 * Math.max(0, e.hp / e.maxHp),
          6,
          3,
          "#e3bc83",
        );
        if (!e.boss)
          text(
            c,
            breeds[e.breed]?.name || "炮塔",
            p.x,
            p.y - 10,
            20,
            "#fff0d4",
          );
      }
    const near = r.near;
    if (near && !r.search && !r.puzzle) {
      const p = this.project(near.x, near.y, 65);
      text(c, "E 打开容器", p.x, p.y, 21, "#fff6d6");
    }
    for (const f of r.floating) {
      const p = this.project(f.x, f.y + 75, 95);
      c.globalAlpha = Math.min(1, f.life * 3);
      text(c, f.text, p.x, p.y, 25, f.color);
    }
    c.globalAlpha = 1;
  }
  drawCombat(r: Raid, c: CanvasRenderingContext2D) {
    c.save();
    c.lineCap = "round";
    for (const b of r.bullets) {
      const p = this.project(b.x, b.y + 24, 30),
        q = this.project(b.x - b.vx * 0.032, b.y + 24 - b.vy * 0.032, 30);
      c.strokeStyle = b.friendly ? "#fff2b5" : "#ff9c70";
      c.shadowColor = c.strokeStyle;
      c.shadowBlur = 10;
      c.lineWidth = b.friendly ? 3 : 3.5;
      c.beginPath();
      c.moveTo(q.x, q.y);
      c.lineTo(p.x, p.y);
      c.stroke();
    }
    for (const fx of r.combatFX) {
      const p = this.project(fx.x, fx.y + 24, 32),
        life = fx.life / fx.max;
      c.globalAlpha = Math.min(1, life * 2);
      c.strokeStyle = fx.friendly ? "#ffe7a0" : "#ff9d78";
      c.fillStyle = "#fff9de";
      c.shadowColor = c.strokeStyle;
      c.shadowBlur = 12;
      const radius = fx.kind === "hit" ? 5 + (1 - life) * 15 : 6 + life * 7;
      c.lineWidth = 2.5;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + fx.angle;
        c.moveTo(
          p.x + Math.cos(a) * radius * 0.4,
          p.y + Math.sin(a) * radius * 0.4,
        );
        c.lineTo(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius);
      }
      c.stroke();
      c.beginPath();
      c.arc(p.x, p.y, fx.kind === "hit" ? 3 : 4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
}
