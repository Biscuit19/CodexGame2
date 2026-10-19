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
  villageDecorations,
  villageScale,
  villageProps,
  inside,
  villagePoint,
  inBuilding,
} from "./village";
import stoneRuin from "./assets/village/stone-ruin.glb?url";
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
import bush from "./assets/village/bush.glb?url";
import grass from "./assets/village/grass.glb?url";
import flower from "./assets/village/flower.glb?url";
import flowerWhite from "./assets/village/flower-white.glb?url";
import hay from "./assets/village/hay.glb?url";
import hunterSide from "./assets/village/hunter-side.glb?url";
import shelter from "./assets/village/shelter.glb?url";
import bench from "./assets/village/bench.glb?url";
import mailbox from "./assets/village/mailbox.glb?url";
import lantern from "./assets/village/lantern.glb?url";
import blanket from "./assets/village/blanket.glb?url";
import basket from "./assets/village/basket.glb?url";
import fridge from "./assets/village/fridge.glb?url";
import bed from "./assets/village/bed.glb?url";
import desk from "./assets/village/desk.glb?url";
import table from "./assets/village/table.glb?url";
import chair from "./assets/village/chair.glb?url";
import cabinet from "./assets/village/cabinet.glb?url";
import well from "./assets/village/well.glb?url";
import fountain from "./assets/village/fountain.glb?url";
import trashcan from "./assets/village/trashcan.glb?url";
import cobblestones from "./assets/village/cobblestones.glb?url";
import bird from "./assets/village/bird.glb?url";
import cooler from "./assets/village/cooler.glb?url";
import radio from "./assets/village/radio.glb?url";
import sacks from "./assets/village/sacks.glb?url";
import pallet from "./assets/village/pallet.glb?url";
import water_bucket from "./assets/village/water-bucket.glb?url";
import target from "./assets/village/target.glb?url";
import open_ruin from "./assets/village/open-ruin.glb?url";
import open_workshop from "./assets/village/open-workshop.glb?url";
const urls: Record<string, string> = {
  "stone-ruin": stoneRuin,
  hunter,
  fountain: fountain,
  trashcan: trashcan,
  cobblestones: cobblestones,
  bird: bird,
  cooler: cooler,
  radio: radio,
  sacks: sacks,
  pallet: pallet,
  "water-bucket": water_bucket,
  target: target,
  "open-ruin": open_ruin,
  "open-workshop": open_workshop,

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
  bush,
  grass,
  flower,
  "flower-white": flowerWhite,
  hay,
  "hunter-side": hunterSide,
  shelter: shelter,
  bench: bench,
  mailbox: mailbox,
  lantern: lantern,
  blanket: blanket,
  basket: basket,
  fridge: fridge,
  bed: bed,
  desk: desk,
  table: table,
  chair: chair,
  cabinet: cabinet,
  well: well,
};
const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Group>>();
function template(id: string) {
  if (!cache.has(id))
    cache.set(
      id,
      loader.loadAsync(urls[id]).then((gltf) => {
        // Preserve UVs, normal smoothing and original gradient textures. Merge
        // only meshes sharing both material and roof/body visibility behavior.
        const parts = new Map<
          string,
          {
            name: string;
            material: THREE.Material;
            geometries: THREE.BufferGeometry[];
          }
        >();
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          let node: THREE.Object3D | null = object,
            roof = false;
          while (node) {
            if (node.name.startsWith("roof_")) roof = true;
            node = node.parent;
          }
          const mat = object.material as THREE.MeshStandardMaterial;
          const name = /^(interior_floor|floor_seam)/.test(object.name)
              ? "floor"
              : roof
                ? "roof"
                : "body",
            key = name + mat.uuid;
          const geometry = object.geometry
            .clone()
            .applyMatrix4(object.matrixWorld);
          const existing = parts.get(key) || {
            name,
            material: mat,
            geometries: [],
          };
          existing.geometries.push(geometry);
          parts.set(key, existing);
        });
        const group = new THREE.Group();
        group.name = `countryside-${id}`;
        for (const entry of parts.values()) {
          const geometry = mergeGeometries(entry.geometries, false)!;
          entry.geometries.forEach((g) => g.dispose());
          const mat = entry.material.clone() as THREE.MeshStandardMaterial;
          mat.roughness = 0.86;
          const mesh = new THREE.Mesh(geometry, mat);
          mesh.name = entry.name;
          mesh.castShadow = mesh.receiveShadow = true;
          group.add(mesh);
        }
        gltf.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
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
        g.rotation.y = -b.rotation;
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
  for (const b of villageBridges)
    requests.push(
      template("bridge").then((t) => {
        if (!stage.parent) return;
        const g = copy(t);
        g.name = `village-bridge-${b.id}`;
        g.position.set(b.x, 0, b.y);
        g.rotation.y = b.rotation;
        g.scale.set(
          (b.rotation ? b.h : b.w) / 400,
          1,
          (b.rotation ? b.w : b.h) / 1600,
        );
        g.userData.deckHeight = 0;
        stage.add(g);
      }),
    );
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
        f.x >= villagePoint(1660, 0).x && f.y <= 660 * villageScale.y ? 65 : 45,
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
  for (const [i, [x, y]] of villageTrees.entries()) {
    const scale = 0.8 + (i % 5) * 0.1;
    add("tree", x, y, 110 * scale, 105 * scale, 165 * scale);
  }
  for (const [i, [x, y]] of villageRocks.entries()) {
    const scale = 0.65 + (i % 4) * 0.18;
    add("rock", x, y, 49 * scale, 38 * scale, 29 * scale, i * 1.77);
  }
  for (const w of r.walls.filter((w) => w.type === "village-cover"))
    add("crate", w.x, w.y, w.w, w.h, w.z);
  const prop = (
    id: string,
    x: number,
    y: number,
    w: number,
    d: number,
    h: number,
  ) => {
    const p = villagePoint(x, y);
    return add(id, p.x, p.y, w, d, h);
  };
  prop("logs", 155, 685, 140, 65, 40);
  prop("wheelbarrow", 2240, 1040, 85, 60, 50);
  prop("windmill", 2240, 815, 230, 190, 340);
  prop("barrel", 2260, 1230, 110, 110, 180);
  stage.userData.props = villageProps;
  for (const p of villageProps)
    add(p.model, p.x, p.y, p.w, p.d, p.height, -p.rotation);
  stage.userData.decorations = villageDecorations;
  const plantGroups = new Map<string, typeof villageDecorations>();
  for (const item of villageDecorations) {
    if (
      r.containers.some((c) => Math.hypot(c.x - item.x, c.y - item.y) < 65) ||
      r.exits.some((e) => Math.hypot(e.x - item.x, e.y - item.y) < 100)
    )
      continue;
    const entries = plantGroups.get(item.kind) || [];
    entries.push(item);
    plantGroups.set(item.kind, entries);
  }
  // Repeated flowers and grass share instanced draw batches as meadow coverage grows.
  stage.userData.decorationBatches = [];
  for (const [kind, items] of plantGroups)
    requests.push(
      template(kind).then((source) => {
        if (!stage.parent) return;
        const bounds = new THREE.Box3().setFromObject(source),
          size = bounds.getSize(new THREE.Vector3()),
          center = bounds.getCenter(new THREE.Vector3());
        for (const child of source.children) {
          if (!(child instanceof THREE.Mesh)) continue;
          const mesh = new THREE.InstancedMesh(
            child.geometry.clone(),
            (child.material as THREE.Material).clone(),
            items.length,
          );
          mesh.name = `meadow-${kind}`;
          mesh.userData.asset = kind;
          mesh.castShadow = mesh.receiveShadow = true;
          items.forEach((item, i) => {
            const height =
              item.size *
              (kind === "grass" ? 0.6 : kind === "bush" ? 0.7 : 0.85);
            const matrix = new THREE.Matrix4()
              .compose(
                new THREE.Vector3(item.x, 0, item.y),
                new THREE.Quaternion().setFromAxisAngle(
                  new THREE.Vector3(0, 1, 0),
                  item.angle,
                ),
                new THREE.Vector3(
                  item.size / size.x,
                  height / size.y,
                  (item.size * 0.8) / size.z,
                ),
              )
              .multiply(
                new THREE.Matrix4().makeTranslation(
                  -center.x,
                  -bounds.min.y,
                  -center.z,
                ),
              );
            mesh.setMatrixAt(i, matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
          mesh.computeBoundingSphere();
          stage.add(mesh);
          stage.userData.decorationBatches.push({ kind, count: items.length });
        }
      }),
    );
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
    const entered = inBuilding(b, r.p.x, r.p.y, 15);
    const occludes =
      Math.abs(r.p.x - b.x) < Math.max(b.w, b.h) * 0.7 + 45 &&
      r.p.y < b.y &&
      b.y - r.p.y <
        Math.max(b.w, b.h) * 0.7 +
          (b.height + 30) / Math.tan((33 * Math.PI) / 180);
    entry.group.traverse((o: THREE.Object3D) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      m.opacity =
        o.name === "floor"
          ? 1
          : entered
            ? o.name === "roof"
              ? 0.1
              : 0.1
            : occludes
              ? 0.12
              : 1;
      m.depthWrite = m.opacity > 0.5;
    });
  }
}
