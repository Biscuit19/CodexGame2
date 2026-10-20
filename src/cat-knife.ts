import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
/** Pink paw guard, wrapped brown grip and swept cream/red blade match the inventory illustration. */
export function createCatKnife() {
  const g = new THREE.Group();
  g.name = "cat-paw-knife";
  const material = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.74 });
  const box = (
    name: string,
    color: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.2),
      material(color),
    );
    m.name = name;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const oval = (
    name: string,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      material(color),
    );
    m.name = name;
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    g.add(m);
    return m;
  };
  const bladeShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, -5);
    s.bezierCurveTo(12, -3, 22, 5, 27, 17);
    s.bezierCurveTo(29, 6, 24, -5, 17, -10);
    s.lineTo(1, -11);
    s.closePath();
    return s;
  };
  for (const [name, color, scale, x, depth] of [
    ["blade-outline", "#172d28", 1.04, 1.3, 2.6],
    ["red-swept-blade", "#ed534b", 1, 1.7, 0.2],
    ["red-swept-blade-back", "#ed534b", 1, -1.5, 0.2],
    ["cream-cutting-face", "#ffedc1", 0.82, 1.95, 0.15],
    ["cream-cutting-face-back", "#ffedc1", 0.82, -1.8, 0.15],
  ] as const) {
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(bladeShape(), {
        depth,
        bevelEnabled: true,
        bevelSize: 0.3,
        bevelThickness: 0.15,
        bevelSegments: 3,
        steps: 1,
        curveSegments: 20,
      }),
      material(color),
    );
    mesh.name = name;
    mesh.rotation.y = -Math.PI / 2;
    mesh.scale.set(scale, scale, 1);
    mesh.position.set(x, 6, 8);
    g.add(mesh);
  }
  // A lowered diagonal hold leaves room beside the cheek and helmet.
  g.rotation.set(-0.62, 0, 0.26);
  g.position.set(0, -2, 2);
  box("brown-wrapped-grip", "#935f3e", 0, 0, -3, 5, 6, 16);
  for (const z of [-8, -4, 0, 4])
    box("dark-grip-wrap", "#513e30", 0, 0, z, 5.5, 6.4, 1.4);
  box("gold-pommel", "#e8b858", 0, 0, -12, 7, 8, 4);
  box("gold-blade-collar", "#e6b35b", 0, 0, 7, 7, 9, 3);
  // A two-sided paw medallion remains recognizable from either aiming direction.
  oval("paw-guard-outline", "#27382d", 0, 0, 7, 4, 10, 9);
  oval("pink-paw-guard", "#ed8179", 0, 0.2, 7, 4.4, 8.8, 7.8);
  for (const side of [-1, 1]) {
    oval("paw-center-pad", "#ffd5b3", side * 4.1, -2, 7, 0.7, 3.2, 3.5);
    for (const [y, z] of [
      [3, 2],
      [5, 6],
      [4, 11],
    ] as const)
      oval("paw-toe-bean", "#ffd5b3", side * 4.1, y, z, 0.7, 1.8, 1.8);
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return g;
}
