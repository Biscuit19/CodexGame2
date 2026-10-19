import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Raid } from "./raid";
import {
  villageBuildings,
  villageBridges,
  villageFenceRects,
  villageTrees,
  villageRocks,
  inside,
} from "./village";
import hunter from "./assets/village/hunter.glb?url";
import clinic from "./assets/village/clinic.glb?url";
import shop from "./assets/village/shop.glb?url";
import home from "./assets/village/home.glb?url";
import barn from "./assets/village/barn.glb?url";
import farmhouse from "./assets/village/farmhouse.glb?url";
import bridge from "./assets/village/bridge.glb?url";
import fence from "./assets/village/fence.glb?url";
import tree from "./assets/village/tree.glb?url";
import rock from "./assets/village/rock.glb?url";
import logs from "./assets/village/logs.glb?url";
import crate from "./assets/village/crate.glb?url";
import barrel from "./assets/village/barrel.glb?url";
import windmill from "./assets/village/windmill.glb?url";
import wheelbarrow from "./assets/village/wheelbarrow.glb?url";
const urls: Record<string, string> = {
  hunter,
  clinic,
  shop,
  home,
  barn,
  farmhouse,
  bridge,
  fence,
  tree,
  rock,
  logs,
  crate,
  barrel,
  windmill,
  wheelbarrow,
};
const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();
function template(id: string) {
  if (!cache.has(id))
    cache.set(
      id,
      loader.loadAsync(urls[id]).then((gltf) => {
        const parts = new Map<string, THREE.BufferGeometry[]>();
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let ancestor: THREE.Object3D | null = object,
            roof = false;
          while (ancestor) {
            if (ancestor.name.startsWith("roof_")) roof = true;
            ancestor = ancestor.parent;
          }
          const key = roof ? "roof" : "body";
          const geometry = object.geometry
            .clone()
            .applyMatrix4(object.matrixWorld);
          const g = geometry.index ? geometry.toNonIndexed() : geometry;
          if (g !== geometry) geometry.dispose();
          const color = g.getAttribute("color"),
            mat = object.material as THREE.MeshStandardMaterial;
          const values = new Float32Array(g.attributes.position.count * 3);
          for (let i = 0; i < g.attributes.position.count; i++)
            values.set(
              [
                color ? color.getX(i) : mat.color.r,
                color ? color.getY(i) : mat.color.g,
                color ? color.getZ(i) : mat.color.b,
              ],
              i * 3,
            );
          for (const name of Object.keys(g.attributes))
            if (name !== "position" && name !== "normal")
              g.deleteAttribute(name);
          g.setAttribute("color", new THREE.BufferAttribute(values, 3));
          if (!g.attributes.normal) g.computeVertexNormals();
          const list = parts.get(key) || [];
          list.push(g);
          parts.set(key, list);
        });
        const group = new THREE.Group();
        group.name = `kaykit-${id}`;
        for (const [name, geometries] of parts) {
          const merged = mergeGeometries(geometries, false)!;
          geometries.forEach((g) => g.dispose());
          const m = new THREE.Mesh(
            merged,
            new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: 0.92,
            }),
          );
          m.name = name;
          m.castShadow = m.receiveShadow = true;
          group.add(m);
        }
        // The packed source objects are no longer needed after merging by roof/body.
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            for (const m of Array.isArray(o.material)
              ? o.material
              : [o.material])
              m.dispose();
          }
        });
        return group;
      }),
    );
  return cache.get(id)!;
}
function copy(source: THREE.Group) {
  const g = source.clone(true);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry = o.geometry.clone();
      o.material = (o.material as THREE.Material).clone();
    }
  });
  return g;
}
function place(
  source: THREE.Group,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  rotation = 0,
  base = 0,
) {
  const g = copy(source),
    bounds = new THREE.Box3().setFromObject(g),
    size = bounds.getSize(new THREE.Vector3()),
    center = bounds.getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();
  pivot.position.set(x, base, z);
  pivot.rotation.y = rotation;
  g.scale.set(w / size.x, h / size.y, d / size.z);
  g.position.set(
    -center.x * g.scale.x,
    -bounds.min.y * g.scale.y,
    -center.z * g.scale.z,
  );
  pivot.add(g);
  return pivot;
}
export function createVillageScene(
  parent: THREE.Group,
  r: Raid,
  onLoaded: () => void,
) {
  const stage = new THREE.Group();
  stage.name = "cat-tail-countryside";
  parent.add(stage);
  const buildings: { group: THREE.Group; id: string }[] = [];
  stage.userData.buildings = buildings;
  const requests: Promise<unknown>[] = [];
  const add = (
    id: string,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
    rotation = 0,
    base = 0,
  ) => {
    const request = template(id).then((t) => {
      if (!stage.parent) return;
      const g = place(t, x, y, w, d, h, rotation, base);
      g.userData.asset = id;
      stage.add(g);
      return g;
    });
    requests.push(request);
    return request;
  };
  for (const b of villageBuildings)
    requests.push(
      template(b.model).then((t) => {
        if (!stage.parent) return;
        const g = copy(t);
        g.position.set(b.x, 0, b.y);
        g.name = `village-building-${b.id}`;
        g.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            const m = o.material as THREE.MeshStandardMaterial;
            m.transparent = true;
            m.depthWrite = true;
          }
        });
        stage.add(g);
        buildings.push({ group: g, id: b.id });
      }),
    );
  for (const b of villageBridges) {
    // Normalize to deck dimensions before rotating the horizontal hunter link.
    add(
      "bridge",
      b.x,
      b.y,
      b.rotation ? b.h : b.w,
      b.rotation ? b.w : b.h,
      30,
      b.rotation,
      -6,
    );
  }
  for (const f of villageFenceRects) {
    const horizontal = f.w > f.h,
      length = horizontal ? f.w : f.h,
      count = Math.ceil(length / 95);
    for (let i = 0; i < count; i++) {
      const offset = -length / 2 + ((i + 0.5) * length) / count;
      add(
        "fence",
        f.x + (horizontal ? offset : 0),
        f.y + (horizontal ? 0 : offset),
        length / count + 2,
        14,
        f.x >= 1660 && f.y <= 660 ? 53 : 33,
        horizontal ? 0 : Math.PI / 2,
      );
    }
  }
  // Small physical road signs reinforce the existing extraction ring/labels.
  for (const exit of r.exits) {
    const sign = new THREE.Group();
    sign.position.set(exit.x - 76, 0, exit.y - 25);
    const timber = new THREE.MeshStandardMaterial({
      color: "#8d6b47",
      roughness: 1,
    });
    const post = new THREE.Mesh(new THREE.BoxGeometry(7, 56, 7), timber);
    post.position.y = 28;
    const board = new THREE.Mesh(new THREE.BoxGeometry(50, 35, 5), timber);
    board.position.y = 49;
    sign.add(post, board);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = exit.paid ? "#d8ad5e" : "#417a59";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#fff4d6";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 70px sans-serif";
    if (exit.paid) {
      ctx.beginPath();
      ctx.ellipse(64, 78, 35, 33, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(48, 21);
      ctx.lineTo(83, 21);
      ctx.lineTo(74, 45);
      ctx.lineTo(56, 45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8a6132";
      ctx.font = "bold 47px sans-serif";
      ctx.fillText("¥", 64, 80);
    } else ctx.fillText("➜", 64, 62);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(44, 29),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    face.position.set(0, 49, 3);
    face.name = "village-road-sign";
    sign.add(face);
    sign.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
    stage.add(sign);
  }
  for (const [x, y] of villageTrees) add("tree", x, y, 70, 68, 115);
  for (const [x, y] of villageRocks) add("rock", x, y, 49, 38, 29);
  for (const w of r.walls.filter((w) => w.type === "village-cover"))
    add("crate", w.x, w.y, w.w, w.h, w.z);
  add("logs", 155, 685, 85, 45, 28);
  add("wheelbarrow", 2240, 1040, 60, 45, 38);
  add("windmill", 2240, 815, 115, 95, 185);
  add("barrel", 2260, 1230, 72, 72, 120);
  for (const [x, y] of [
    [1850, 815],
    [2200, 1030],
    [2210, 1280],
  ]) {
    const hay = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 48, 18),
      new THREE.MeshStandardMaterial({ color: "#c6aa57", roughness: 1 }),
    );
    hay.rotation.z = Math.PI / 2;
    hay.position.set(x, 24, y);
    hay.castShadow = hay.receiveShadow = true;
    stage.add(hay);
  }
  Promise.all(requests)
    .then(() => {
      if (stage.parent) {
        stage.userData.assetsReady = true;
        onLoaded();
      }
    })
    .catch((error) => {
      stage.userData.assetError = String(error);
      r.notify("乡村模型载入失败，请刷新重试");
    });
  return stage;
}
export function updateVillageScene(stage: THREE.Group, r: Raid) {
  for (const entry of stage.userData.buildings || []) {
    const b = villageBuildings.find((b) => b.id === entry.id)!;
    const entered = inside(r.p.x, r.p.y, b, -12);
    const occludes =
      Math.abs(r.p.x - b.x) < b.w / 2 + 55 &&
      r.p.y < b.y + b.h / 2 &&
      b.y - b.h / 2 - r.p.y < (b.height + 30) / Math.tan((33 * Math.PI) / 180);
    entry.group.traverse((o: THREE.Object3D) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      m.opacity = entered
        ? o.name === "roof"
          ? 0.045
          : 0.2
        : occludes
          ? 0.16
          : 1;
      m.depthWrite = m.opacity > 0.5;
    });
  }
}
