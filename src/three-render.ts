import { createVillageScene, updateVillageScene } from "./village-scene";
import { villageBuildings } from "./village";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { breeds, maps, db } from "./data";
import { weaponPalette } from "./equipment-art";
import type { Raid, Enemy, Container } from "./raid";
import { Renderer } from "./render";
import { text, round } from "./art";
import { PawPrints } from "./pawprints";
import {
  createPlayerCat,
  animatePlayerCat,
  updatePlayerEquipment,
  type PlayerCatRig,
  type PlayerPose,
} from "./player-cat";

const CAMERA_ELEVATION = (33 * Math.PI) / 180;

type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legs: THREE.Group[];
  tail: THREE.Group;
  gun: THREE.Group;
  knife: THREE.Group;
  helmet: THREE.Group;
  vest: THREE.Group;
  eyes: THREE.Group[];
  tailJoints: THREE.Object3D[];
  player?: PlayerPose;
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
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    if (!cached.has(o.geometry)) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (!shared.has(m)) mats.add(m);
  });
  geometries.forEach((g) => g.dispose());
  mats.forEach((m) => {
    if (
      m instanceof THREE.MeshBasicMaterial &&
      (m.name === "player-contact-shadow" || m.map instanceof THREE.CanvasTexture)
    )
      m.map?.dispose();
    m.dispose();
  });
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
function weaponModel(g: THREE.Group, id: string) {
  if (g.userData.weaponId === id) return;
  release(g);
  g.clear();
  const index = Number(id.slice(1)),
    def = db[id];
  const [body, accent] = weaponPalette[index] ?? weaponPalette[0];
  const cream = "#f3dea3",
    ink = "#183b45",
    pink = "#ee9bad";
  const long = def.weaponClass === "sniper",
    shotgun = def.weaponClass === "shotgun";
  const len = long ? 36 : shotgun ? 28 : def.weaponClass === "smg" ? 20 : 27;
  block(g, body, 0, 0, 7, 9, 9, len, 2);
  block(g, accent, 0, 2, 16, 10, 7, 13, 2);
  block(g, ink, 0, -8, 2, 5, 13, 7, 1);
  cylinder(
    g,
    ink,
    0,
    0,
    len + 6,
    shotgun ? 2.7 : 1.8,
    1.8,
    long ? 30 : 16,
  ).rotation.x = Math.PI / 2;
  block(g, ink, 0, 5, len + 10, 3, 5, 3, 0.5);
  if (!shotgun) block(g, cream, 0, -10, 12, 5, 15, 8, 1.5).rotation.x = -0.23;
  if (long) {
    block(g, ink, 0, 8, 7, 4, 5, 11, 1);
    cylinder(g, body, 0, 12, 8, 4, 4, 20).rotation.x = Math.PI / 2;
  }
  const tube = (points: number[][], color: string, radius = 2.5) =>
    mesh(
      g,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
        ),
        12,
        radius,
        6,
        false,
      ),
      color,
      0,
      0,
      0,
    );
  const ring = (y: number, z: number, color: string, radius: number) => {
    const m = mesh(
      g,
      new THREE.TorusGeometry(radius, 1.7, 6, 16),
      color,
      0,
      y,
      z,
    );
    m.rotation.y = Math.PI / 2;
    return m;
  };
  const ear = (x: number, y: number, z: number, color = accent, size = 6) =>
    mesh(g, new THREE.ConeGeometry(size, size * 1.6, 3), color, x, y, z);
  const paw = (y: number, z: number, color = accent, size = 7) => {
    ball(g, color, 0, y, z, 5, size, size);
    ball(g, pink, 5, y, z, 1, size * 0.5, size * 0.5);
    for (const n of [-1, 0, 1])
      ball(g, pink, 5, y + size * 0.65, z + n * size * 0.6, 1.2, 2, 2);
  };
  if (![3, 9, 14, 19].includes(index))
    block(g, accent, 0, 0, -11, 8, 10, 14, 3);
  switch (index) {
    case 0:
      ring(3, -16, accent, 10);
      break;
    case 1:
      ear(-5, 7, 18);
      ear(5, 7, 18);
      break;
    case 2:
      cylinder(g, accent, 0, -11, 11, 9, 9, 9).rotation.z = Math.PI / 2;
      ring(-11, 11, cream, 4);
      break;
    case 3:
      for (const n of [-1, 0, 1]) {
        tube(
          [
            [0, 0, -3],
            [n * 3, n * 5, -13],
            [n * 5, n * 13, -25],
            [n * 5, n * 16, -32],
          ],
          accent,
          4,
        );
        ball(g, "#cb5930", n * 4, n * 10, -21, 4.3, 3, 3);
      }
      break;
    case 4:
      paw(-11, 20, cream, 8);
      break;
    case 5:
      for (const z of [-1, 7, 15]) block(g, accent, 0, 5, z, 10, 2, 3, 0.5);
      ear(-4, 10, 7, accent, 4);
      ear(4, 10, 7, accent, 4);
      break;
    case 6:
      for (const n of [-1, 0, 1])
        tube(
          [
            [0, 3, 17],
            [n * 5, 3 + n * 5, 28],
            [n * 7, 3 + n * 7, 34],
          ],
          cream,
          1.8,
        );
      break;
    case 7:
      paw(-1, -15, accent, 10);
      break;
    case 8:
    case 12:
      block(g, cream, 0, 10, 6, 3, 3, 28, 1);
      for (const z of [-3, 4, 11, 18]) block(g, cream, 0, 11, z, 15, 3, 3, 1);
      if (index === 12) block(g, cream, 0, 7, 11, 12, 4, 25, 2);
      break;
    case 9:
      for (const [y, z, s] of [
        [0, -12, 10],
        [6, -18, 8],
        [-5, -19, 7],
      ])
        ball(g, cream, 0, y, z, 6, s, s);
      break;
    case 10:
      for (const n of [-1, 1])
        tube(
          [
            [0, 0, -4],
            [0, n * 7, -15],
            [0, 0, -21],
          ],
          accent,
          3,
        );
      for (const z of [14, 19, 24]) block(g, ink, 5, 1, z, 1, 7, 2, 0.2);
      break;
    case 11:
      paw(0, 57, accent, 8);
      break;
    case 13:
      tube(
        [
          [0, 0, 8],
          [0, -13, 6],
          [0, -18, 14],
        ],
        body,
        4,
      );
      paw(-18, 14, accent, 6);
      break;
    case 14:
      block(g, cream, 0, 0, -10, 16, 18, 20, 6);
      break;
    case 15:
      ear(-5, 14, 10, pink, 8);
      ear(5, 14, 10, pink, 8);
      block(g, body, 0, 9, 8, 13, 3, 20, 1);
      break;
    case 16:
      for (const z of [12, 16, 20]) block(g, "#aa7946", 0, 6, z, 10, 2, 2, 0.5);
      break;
    case 17:
      ear(-4, -5, 27, cream, 5).rotation.x = Math.PI;
      ear(4, -5, 27, cream, 5).rotation.x = Math.PI;
      break;
    case 18:
      ring(-10, 4, accent, 9);
      ball(g, accent, 0, -19, 6, 5, 6, 6);
      break;
    case 19:
      for (const n of [-2, -1, 0, 1, 2])
        ear(n * 3, n * 4, -13, accent, 8).rotation.x = -Math.PI / 2;
      cylinder(g, accent, 0, -11, 9, 10, 10, 10).rotation.z = Math.PI / 2;
      break;
  }
  batchStatic(g);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  g.userData.weaponId = id;
}
function makeCat(breed = -2, boss = false): Rig {
  if (breed === -2) return createPlayerCat();
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
  root.scale.setScalar(0.78);
  const eyes: THREE.Group[] = [],
    tailJoints: THREE.Group[] = [];
  root.userData.blinkPhase = Math.random() * 5;
  ball(body, b.fur, 0, 21, 0, 21, 18, 16);
  ball(body, "#f2e2c6", 0, 20, 13, 13, 13, 5);
  const vest = new THREE.Group();
  body.add(vest);
  block(vest, "#536c4e", 0, 25, 14, 25, 17, 7, 5);
  for (const side of [-1, 1]) {
    block(vest, "#879368", side * 7, 23, 19, 8, 8, 4, 2);
    block(vest, "#536c4e", side * 14, 31, 3, 4, 5, 23, 2);
  }
  block(vest, "#d7c18b", 0, 30, 19, 4, 4, 2, 1);
  body.add(pack);
  block(pack, "#717958", 0, 27, -16, 25, 29, 13, 5);
  block(pack, "#a3a77b", 0, 27, -24, 18, 12, 4, 2);
  block(pack, "#3b5140", 0, 39, -20, 13, 3, 5, 1);
  const legs = [new THREE.Group(), new THREE.Group()];
  legs.forEach((leg, i) => {
    leg.position.set(i ? 11 : -11, 10, 0);
    body.add(leg);
    ball(leg, b.fur, 0, -3, 0, 8, 8, 8);
    ball(leg, b.fur, 0, -7, 5, 9, 5, 11);
  });
  head.position.set(0, 45, 2);
  body.add(head);
  ball(head, b.fur, 0, 0, 0, 26, 21, 21);
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
      side * 19,
      19,
      0,
    );
    ear.rotation.y = Math.PI / 2;
    ear.rotation.z = -side * 0.16;
    const inner = mesh(
      head,
      new THREE.ConeGeometry(6, earHeight * 0.7, 3),
      "#ce9e98",
      side * 19,
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
    const eye = new THREE.Group();
    eye.position.set(side * 10, 1, 20);
    head.add(eye);
    eyes.push(eye);
    ball(eye, "#fff5df", 0, 0, 0, 6.3, 6.8, 2);
    ball(eye, b.eye, side * 0.7, -0.2, 1.4, 4.3, 5.4, 1.5);
    ball(eye, "#23352e", side * 0.7, -0.4, 2.4, 2.4, 4.1, 0.8);
    ball(eye, "#ffffff", -1, 2, 3, 1.5, 1.7, 0.6);
    ball(head, "#e6a4a0", side * 18, -6, 17, 4, 2, 1.2);
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
  // A narrow cap sits between the ears; no solid shell intersects their roots.
  ball(helmet, "#526c4b", 0, 18, -1, 10, 7, 15);
  block(helmet, "#849366", 0, 16, 14, 19, 3, 8, 2);
  block(helmet, "#d7c18b", 0, 20, 14, 5, 5, 2, 1);
  helmet.visible = breed !== -1;
  tail.position.set(0, 17, -12);
  body.add(tail);
  let jointParent = tail;
  for (let i = 0; i < 6; i++) {
    const joint = new THREE.Group();
    joint.position.set(0, i ? 2 : 0, i ? -6 : 0);
    jointParent.add(joint);
    ball(
      joint,
      i === 5 ? b.fur : b.patch,
      0,
      1,
      -3,
      4.2 - i * 0.3,
      4.2 - i * 0.3,
      5,
    );
    tailJoints.push(joint);
    jointParent = joint;
  }
  gun.position.set(-19, 26, 14);
  gun.scale.setScalar(0.78);
  body.add(gun);
  block(gun, "#334941", 0, 0, 9, 8, 8, 30, 2);
  block(gun, "#929475", 0, 1, 3, 9, 7, 15, 2);
  block(gun, "#3c4c42", 0, -7, 3, 5, 9, 8, 1);
  const barrel = cylinder(gun, "#2e3f3a", 0, 0, 30, 2.1, 2.1, 19);
  barrel.rotation.x = Math.PI / 2;
  block(gun, "#b6a480", 0, 5, 10, 4, 2, 7, 1);
  ball(body, b.fur, -20, 29, 15, 5.5, 6, 6);
  ball(body, b.fur, -8, 30, 23, 5, 5, 5);
  if (boss) root.scale.multiplyScalar(breed === 14 ? 1.3 : 1.15);
  [head, helmet, pack, gun].forEach(batchStatic);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(64, 50), contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 1;
  root.add(shadow);
  const knife = new THREE.Group();
  knife.position.copy(gun.position);
  knife.scale.setScalar(0.78);
  body.add(knife);
  block(knife, "#b8563c", 0, 0, 5, 5, 5, 16, 1);
  block(knife, "#f3dea3", 0, 0, 23, 3, 7, 24, 1);
  ball(knife, "#ee9bad", 0, 4, 6, 5, 2, 5);
  for (const x of [-4, 0, 4]) ball(knife, "#f3b3c3", x, 4, 11, 2, 2, 2);
  knife.visible = false;
  // Put the rotation pivot inside the belly for a compact somersault.
  body.children.forEach((child) => (child.position.y -= 29));
  return {
    root,
    body,
    head,
    legs,
    tail,
    gun,
    helmet,
    vest,
    pack,
    knife,
    eyes,
    tailJoints,
  };
}

/** Map one uses real geometry, orthographic projection, light and articulated models. */
export class ThreeRenderer {
  canvas: HTMLCanvasElement;
  webgl: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera();
  world = new THREE.Group();
  pawPrints = new PawPrints();
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
  villageStage?: THREE.Group;
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
    this.scene.add(this.world, this.pawPrints.group);
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
    this.villageStage = createVillageScene(this.world, r, () => {
      this.webgl.shadowMap.needsUpdate = true;
    });
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
    if (["litter", "cabinet", "bed"].includes(c.type)) {
      if (c.type === "litter") {
        cylinder(group, "#899287", 0, 17, 0, 18, 16, 32);
        cylinder(group, "#c7bf95", 0, 32, 0, 19, 19, 5);
        block(group, "#647565", 0, 18, 17, 13, 13, 2, 2);
      } else if (c.type === "cabinet") {
        block(group, "#7e8a78", 0, 24, 0, 35, 48, 27, 2);
        for (const y of [12, 28, 41]) {
          block(group, "#9da894", 0, y, 14, 30, 10, 2, 1);
          block(group, "#d4c59e", 0, y + 1, 16, 10, 2, 3, 1);
        }
      } else {
        ball(group, "#ae7862", 0, 9, 0, 26, 10, 21);
        ball(group, "#dcc397", 0, 15, 0, 20, 5, 15);
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(21, 5, 8, 24),
          material("#ae7862"),
        );
        rim.rotation.x = Math.PI / 2;
        rim.scale.y = 0.8;
        rim.position.y = 16;
        rim.castShadow = true;
        group.add(rim);
      }
      batchStatic(group);
      group.add(lid);
      this.world.add(group);
      return { group, lid };
    }
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
    helmet = 1,
    armor = 1,
    bag = true,
    rollDirection = angle,
    rollAim = angle,
    movementDirection = angle,
    bagTier = bag ? 1 : 0,
  ) {
    rig.root.position.set(x, 0, y);
    rig.root.rotation.y = Math.PI / 2 - angle;
    const time = performance.now() / 1000;
    if (rig.player) {
      updatePlayerEquipment(
        rig as PlayerCatRig,
        helmet,
        armor,
        bag ? bagTier : 0,
      );
      animatePlayerCat(
        rig as PlayerCatRig,
        time,
        walk,
        angle,
        roll,
        rollDirection,
        rollAim,
        movementDirection,
      );
      return;
    }
    rig.body.position.y =
      34 + (walk ? Math.abs(Math.sin(walk)) * 2.1 : Math.sin(time * 2.5) * 0.5);
    rig.body.rotation.set(0, 0, walk ? Math.sin(walk) * 0.1 : 0);
    rig.head.rotation.z = walk
      ? -Math.sin(walk) * 0.08
      : Math.sin(time * 1.3) * 0.025;
    rig.head.rotation.x = Math.sin(time * 2) * 0.025;
    rig.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = walk ? Math.sin(walk + i * Math.PI) * 0.5 : 0),
    );
    rig.tailJoints.forEach((joint, i) => {
      joint.rotation.y =
        Math.sin(time * 2.8 - i * 0.46 + rig.root.userData.blinkPhase) *
        (0.13 + i * 0.025);
      joint.rotation.x = -0.18 + Math.sin(time * 2.1 - i * 0.38) * 0.08;
    });
    const blinkTime = (time + rig.root.userData.blinkPhase) % 4.6;
    const blink =
      blinkTime < 0.18 ? Math.max(0.06, Math.abs(blinkTime - 0.09) / 0.09) : 1;
    rig.eyes.forEach((eye) => (eye.scale.y = blink));
    rig.helmet.visible = helmet > 0;
    rig.vest.visible = armor > 0;
    const gearColors = ["#7f8d69", "#5c9877", "#648fad", "#ac8bb9", "#ccaa5f"];
    for (const [gear, tier] of [
      [rig.helmet, helmet],
      [rig.vest, armor],
    ] as const) {
      if (gear.userData.tier !== tier) {
        gear.traverse((o) => {
          if (o instanceof THREE.Mesh)
            o.material = material(gearColors[Math.max(0, tier - 1)]);
        });
        gear.userData.tier = tier;
      }
    }
    rig.pack.visible = bag;
    if (roll > 0) {
      const progress = Math.min(1, (0.35 - roll) / 0.35);
      // Turn sideways/diagonal dodges into the same tucked somersault as forward/backward dodges.
      const forward = Math.cos(rollDirection - rollAim) >= -1e-6;
      const facing = rollDirection + (forward ? 0 : Math.PI);
      rig.root.rotation.y = Math.PI / 2 - facing;
      rig.body.quaternion.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        (forward ? 1 : -1) * progress * Math.PI * 2,
      );
      rig.body.position.y = 29 + Math.sin(progress * Math.PI) * 9;
      rig.body.position.z = 0;
      rig.head.rotation.x = -0.18;
      rig.legs.forEach((leg) => (leg.rotation.x = -0.75));
    }
  }
  render(r: Raid, flat: Renderer) {
    this.resize();
    this.prepare(r, flat);
    this.show(true);
    const px = Math.max(490, Math.min(1920, r.p.x)),
      pz = Math.max(260, Math.min(1520, r.p.y));
    this.camera.position.set(px, 1100 * Math.tan(CAMERA_ELEVATION), pz + 1000);
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
      r.save.equipment.helmet ? db[r.save.equipment.helmet.id].tier : 0,
      r.save.equipment.armor ? db[r.save.equipment.armor.id].tier : 0,
      !!r.save.equipment.bag,
      Math.atan2(r.p.rollY, r.p.rollX),
      r.p.rollAim,
      r.p.moveAngle,
      r.save.equipment.bag ? db[r.save.equipment.bag.id].tier : 0,
    );
    if (this.villageStage) updateVillageScene(this.villageStage, r);
    this.pawPrints.update(r.footprints);
    const player = this.actors.get("player")!;
    if (r.weaponItem && r.activeWeapon !== "melee")
      weaponModel(player.gun, r.weaponItem.id);
    player.gun.visible = r.activeWeapon !== "melee" && !!r.weaponItem;
    player.knife.visible =
      r.activeWeapon === "melee" && !!r.save.equipment.melee;
    player.knife.rotation.y =
      r.meleeCooldown > 0
        ? Math.sin((r.meleeCooldown / 0.45) * Math.PI) * 1.7
        : 0;
    const ids = new Set(["player"]);
    for (const e of r.enemies) {
      ids.add(e.id);
      let rig = this.actors.get(e.id);
      if (!rig) {
        rig = makeCat(e.breed, !!e.boss);
        this.actors.set(e.id, rig);
        this.world.add(rig.root);
      }
      weaponModel(rig.gun, `w${e.weapon}`);
      this.updateRig(
        rig,
        e.x,
        e.y,
        e.angle,
        e.walk,
        0,
        e.helmetDurability > 0 ? e.tier : 0,
        e.armorDurability > 0 ? e.tier : 0,
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
        w.rect.y + w.rect.h * 0.5 > r.p.y &&
        Math.abs(w.rect.x - r.p.x) < w.rect.w * 0.5 + 28 &&
        w.rect.y - w.rect.h * 0.5 - r.p.y <
          (w.rect.z + 15) / Math.tan(CAMERA_ELEVATION);
      const m = w.mesh.material as THREE.MeshStandardMaterial;
      m.opacity = hide ? 0.16 : 1;
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
    for (const b of villageBuildings) {
      const p = this.project(b.x, b.y, b.height + 27);
      round(c, p.x - 83, p.y - 18, 166, 35, 8, "#2e483be6");
      text(c, b.name, p.x, p.y + 5, 23, "#f4e9c8");
    }
    const farmLabel = this.project(2030, 855, 15);
    round(c, farmLabel.x - 48, farmLabel.y - 18, 96, 35, 8, "#2e483be6");
    text(c, "农田", farmLabel.x, farmLabel.y + 5, 23, "#f4e9c8");
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
    for (const e of r.enemies) {
      const p = this.project(e.x, e.y, e.boss ? 133 : 105);
      text(
        c,
        e.boss?.name ?? breeds[e.breed]?.name ?? "炮塔",
        p.x,
        p.y,
        20,
        "#fff0d4",
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
      }
    const near = r.near;
    if (near && !r.search && !r.puzzle) {
      const p = this.project(near.x, near.y, 65);
      text(c, `E ${near.name}`, p.x, p.y, 21, "#fff6d6");
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
      if (fx.kind === "melee") {
        c.strokeStyle = "#e9f2d1";
        c.shadowColor = "#dfe8c9";
        c.shadowBlur = 9;
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(p.x, p.y, 75, 48, 0, fx.angle - 1.1, fx.angle + 1.1);
        c.stroke();
        continue;
      }
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
