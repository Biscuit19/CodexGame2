import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import kit from "./assets/village/container-kit.glb?url";
import type { Container, Raid } from "./raid";
import {
  containerKind,
  highValueContainer,
  containerHighlighted,
  containerOutlineWidth,
  containerHighlightColor,
} from "./container-info";
let loaded: Promise<THREE.Group> | undefined;
const outlineMaterial = (color: string, width: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      outlineColor: { value: new THREE.Color(color) },
      width: { value: width },
    },
    vertexShader: `uniform float width;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*width,1.0);}`,
    fragmentShader: `uniform vec3 outlineColor;void main(){gl_FragColor=vec4(outlineColor,1.0);}`,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
  });
export type ContainerModel = {
  group: THREE.Group;
  closed: THREE.Group;
  opened: THREE.Group;
  outlines: THREE.Object3D[];
};
export function createContainerModel(c: Container): ContainerModel {
  const group = new THREE.Group(),
    closed = new THREE.Group(),
    opened = new THREE.Group();
  group.name = `search-container-${containerKind(c)}`;
  group.position.set(c.x, 0, c.y);
  group.add(closed, opened);
  opened.visible = false;
  const result = { group, closed, opened, outlines: [] as THREE.Object3D[] };
  loaded ??= new GLTFLoader().loadAsync(kit).then((g) => g.scene);
  void loaded
    .then((source) => {
      for (const [state, destination] of [
        ["closed", closed],
        ["open", opened],
      ] as const) {
        const key = `container_${containerKind(c).replaceAll("-", "_")}_${state}`;
        const template = source.getObjectByName(key);
        if (!template) throw Error(`容器模型缺失：${key}`);
        const root = template.clone(true);
        root.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        root.traverse((o) => {
          if (o instanceof THREE.Mesh) meshes.push(o);
        });
        const outline = outlineMaterial(
          containerHighlightColor(c),
          containerOutlineWidth(c),
        );
        for (const mesh of meshes) {
          mesh.geometry = mesh.geometry.clone();
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.roughness = 0.87;
          mesh.material = mat;
          mesh.castShadow = mesh.receiveShadow = true;
          const edge = new THREE.Mesh(mesh.geometry.clone(), outline);
          edge.name = "nearby-container-outline";
          edge.visible = false;
          edge.frustumCulled = false;
          mesh.add(edge);
          result.outlines.push(edge);
        }
        destination.add(root);
      }
      group.userData.ready = true;
      group.userData.kind = containerKind(c);
      group.userData.highValue = highValueContainer(c);
    })
    .catch((error) => {
      group.userData.assetError = String(error);
      console.error(error);
    });
  return result;
}
export function updateContainerModel(m: ContainerModel, c: Container, r: Raid) {
  m.group.visible = true;
  m.closed.visible = !c.open;
  m.opened.visible = c.open;
  const nearby = containerHighlighted(c, r);
  for (const edge of m.outlines) edge.visible = nearby;
  m.group.userData.highlighted = nearby;
  m.group.userData.searched = c.open;
}
