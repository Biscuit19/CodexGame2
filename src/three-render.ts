import { animateReload } from "./reload-motion";
import { animateKnifeHold } from "./knife-motion";
import {
  containerHighlighted,
  containerHighlightColor,
} from "./container-info";
import {
  createContainerModel,
  updateContainerModel,
  type ContainerModel,
} from "./container-models";
import { createVillageScene, updateVillageScene } from "./village-scene";
import { villageBuildings, villagePoint } from "./village";
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
      (m.name === "player-contact-shadow" ||
        m.map instanceof THREE.CanvasTexture)
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
  const magazine = new THREE.Group();
  magazine.name = "reload-magazine";
  magazine.position.set(0, -10, 12);
  g.add(magazine);
  if (!shotgun && index !== 2)
    block(magazine, cream, 0, 0, 0, 5, 15, 8, 1.5).rotation.x = -0.23;
  if (shotgun && index !== 19) {
    block(magazine, ink, 0, 3, 0, 6, 8, 10, 1.5);
    block(magazine, accent, 0, 2, 0, 6.5, 2, 10.5, 0.6);
  }
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
      magazine.userData.reloadDrop = 2;
      cylinder(magazine, accent, 0, -1, -1, 9, 9, 9).rotation.z = Math.PI / 2;
      mesh(
        magazine,
        new THREE.TorusGeometry(4, 1.7, 6, 16),
        cream,
        0,
        -1,
        -1,
      ).rotation.y = Math.PI / 2;
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
      magazine.userData.reloadDrop = 2;
      cylinder(magazine, accent, 0, -1, -3, 10, 10, 10).rotation.z =
        Math.PI / 2;
      break;
  }
  batchStatic(g);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  g.userData.weaponId = id;
}
function makeCat(breed = -1, boss = false): Rig {
  if (breed === -1) return createPlayerCat();
  const b = breeds[breed] || breeds[0],
    rig = createPlayerCat({ ...b, breed });
  rig.root.name = "smooth-enemy-cat";
  rig.root.userData.enemy = true;
  rig.root.userData.breed = breed;
  rig.root.userData.boss = boss;
  rig.root.scale.setScalar(0.86 * (boss ? (breed === 14 ? 1.3 : 1.15) : 1));
  rig.head.position.y = 13;
  rig.head.scale.set(0.92, 0.95, 1);
  const torso = rig.body.getObjectByName("rounded-calico-body")!;
  torso.scale.set(1.15, 1.8, 1.1);
  torso.position.y += 5;
  rig.legs.forEach((leg) => leg.children[0].scale.setScalar(1.2));
  rig.arms.forEach((arm) => (arm.position.y += 11.5));
  rig.head.remove(rig.helmet);
  rig.body.remove(rig.vest, rig.pack);
  release(rig.helmet);
  release(rig.vest);
  release(rig.pack);
  const helmet = new THREE.Group(),
    vest = new THREE.Group(),
    pack = new THREE.Group();
  ball(helmet, "#526c4b", 0, 18, -1, 10, 7, 15);
  block(helmet, "#849366", 0, 16, 14, 19, 3, 8, 2);
  block(helmet, "#d7c18b", 0, 20, 14, 5, 5, 2, 1);
  block(vest, "#536c4e", 0, 25, 14, 25, 17, 7, 5);
  for (const side of [-1, 1]) {
    block(vest, "#879368", side * 7, 23, 19, 8, 8, 4, 2);
    block(vest, "#536c4e", side * 14, 31, 3, 4, 5, 23, 2);
  }
  block(vest, "#d7c18b", 0, 30, 19, 4, 4, 2, 1);
  block(pack, "#717958", 0, 27, -16, 25, 29, 13, 5);
  block(pack, "#a3a77b", 0, 27, -24, 18, 12, 4, 2);
  block(pack, "#3b5140", 0, 39, -20, 13, 3, 5, 1);
  vest.position.y = pack.position.y = -29;
  rig.head.add(helmet);
  rig.body.add(vest, pack);
  Object.assign(rig, { helmet, vest, pack });
  rig.gun.scale.setScalar(0.78);
  return rig;
}

export class ThreeRenderer {
  canvas: HTMLCanvasElement;
  webgl: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera();
  world = new THREE.Group();
  pawPrints = new PawPrints();
  actors = new Map<string, Rig>();
  containers = new Map<Container, ContainerModel>();
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
  sun!: THREE.DirectionalLight;
  shadowAnchor = { x: -99999, y: -99999 };
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
    this.webgl.toneMappingExposure = 1.05;
    this.scene.background = new THREE.Color("#9eac87");
    this.scene.add(new THREE.HemisphereLight("#faf6ed", "#7b8874", 1.7));
    const sun = (this.sun = new THREE.DirectionalLight("#fff2df", 2.2));
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
      r.width / 2,
      -0.5,
      r.height / 2,
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
    const model = createContainerModel(c);
    this.world.add(model.group);
    return model;
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
      if (!rig.root.userData.enemy)
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
      if (rig.root.userData.enemy) {
        rig.body.position.y += 3;
        rig.helmet.visible = helmet > 0;
        rig.vest.visible = armor > 0;
        rig.pack.visible = bag;
        const palette = ["#7f8d69", "#5c9877", "#648fad", "#ac8bb9", "#ccaa5f"];
        for (const [gear, tier] of [
          [rig.helmet, helmet],
          [rig.vest, armor],
        ] as const) {
          if (gear.userData.tier !== tier) {
            gear.traverse((o) => {
              if (o instanceof THREE.Mesh)
                o.material = material(palette[Math.max(0, tier - 1)]);
            });
            gear.userData.tier = tier;
          }
        }
      }
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
    const px = Math.max(490, Math.min(r.width - 490, r.p.x)),
      pz = Math.max(260, Math.min(r.height - 280, r.p.y));
    this.camera.position.set(px, 1100 * Math.tan(CAMERA_ELEVATION), pz + 1000);
    this.camera.lookAt(px, 0, pz - 100);
    const shake = r.shake * r.save.settings.shake;
    this.camera.position.x += Math.sin(r.elapsed * 140) * shake;
    this.camera.position.z += Math.cos(r.elapsed * 180) * shake;
    this.camera.updateMatrixWorld();
    if (Math.hypot(px - this.shadowAnchor.x, pz - this.shadowAnchor.y) > 180) {
      this.sun.position.set(px - 750, 1200, pz - 800);
      this.sun.target.position.set(px, 0, pz);
      this.shadowAnchor = { x: px, y: pz };
      this.sun.target.updateMatrixWorld();
      this.webgl.shadowMap.needsUpdate = true;
    }
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
    animateKnifeHold(
      player.knife,
      player.player!.arms[0],
      r.meleeCooldown,
      r.meleeSwing,
    );
    animateReload(
      player.gun,
      player.player!.arms,
      player.gun.visible && !r.p.roll ? r.reload : 0,
      r.weapon?.reload ?? 1,
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
      updateContainerModel(m, c, r);
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
      if (!b.name) continue;
      const p = this.project(b.x, b.y, b.height + 27);
      round(c, p.x - 83, p.y - 18, 166, 35, 8, "#2e483be6");
      text(c, b.name, p.x, p.y + 5, 23, "#f4e9c8");
    }
    const fieldPoint = villagePoint(2030, 855);
    const farmLabel = this.project(fieldPoint.x, fieldPoint.y, 15);
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
    for (const container of r.containers) {
      if (!containerHighlighted(container, r)) continue;
      const p = this.project(container.x, container.y, 65);
      const label = `${r.near === container && !r.search && !r.puzzle ? "E " : ""}${container.name}`;
      c.font = '600 23px "三角猫黑体", "Microsoft YaHei", sans-serif';
      const width = c.measureText(label).width + 20;
      round(c, p.x - width / 2, p.y - 25, width, 34, 9, "#203d32e8");
      text(c, label, p.x, p.y, 23, containerHighlightColor(container));
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
