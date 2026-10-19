import * as THREE from "three";

const RINGS = 60,
  SIDES = 12;
const hash = (n: number) => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
/** Pick directions around the full circle, then ease along the shorter arc. No per-frame noise. */
export function tailTipDirection(time: number, seed: number) {
  const clock = (time + seed * 0.73) / 2.6;
  const segment = Math.floor(clock),
    t = clock - segment;
  const a = hash(segment + seed * 17.3) * Math.PI * 2;
  const b = hash(segment + 1 + seed * 17.3) * Math.PI * 2;
  const ease = t * t * t * (t * (t * 6 - 15) + 10);
  const angle = a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * ease;
  return { x: Math.cos(angle), z: Math.sin(angle) };
}

export function tailRootMotion(time: number, phase: number) {
  return {
    x: Math.sin(time * 1.1 + phase) * 0.12,
    y:
      (1.3 + 0.12 * Math.sin(time * 0.31 + phase)) *
      Math.sin(time * 1.65 + phase),
  };
}

type TailState = {
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.MeshStandardMaterial>;
  cap: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  centers: THREE.Vector3[];
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  point: THREE.Vector3;
  toHead: THREE.Matrix4;
  fromHead: THREE.Matrix4;
};
const states = new WeakMap<THREE.Group, TailState>();

export function createPlayerTail(parent: THREE.Group) {
  const tail = new THREE.Group();
  tail.name = "continuous-responsive-tail";
  tail.position.set(0, 11, -12.5);
  parent.add(tail);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(),
    new THREE.Vector3(0, 2, -9),
    new THREE.Vector3(0, 10, -17),
    new THREE.Vector3(0, 20, -24),
    new THREE.Vector3(0, 25, -24),
    new THREE.Vector3(0, 26, -24),
  ]);
  const geometry = new THREE.TubeGeometry(curve, RINGS, 4.1, SIDES, false);
  const color = new Float32Array((RINGS + 1) * (SIDES + 1) * 3);
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS,
      c = new THREE.Color(
        t > 0.77 ? "#f5dfba" : t > 0.44 ? "#563a29" : "#e89642",
      );
    for (let j = 0; j <= SIDES; j++) {
      const offset = (i * (SIDES + 1) + j) * 3;
      color.set([c.r, c.g, c.b], offset);
    }
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
  );
  mesh.name = "continuous-tail-surface";
  mesh.frustumCulled = false;
  tail.add(mesh);
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(2, 20, 14),
    new THREE.MeshStandardMaterial({ color: "#f5dfba", roughness: 0.95 }),
  );
  tail.add(cap);
  const bones = Array.from({ length: 6 }, (_, i) => {
    const marker = new THREE.Group();
    marker.name = `tail-center-${i}`;
    tail.add(marker);
    return marker;
  });
  states.set(tail, {
    mesh,
    cap,
    curve,
    centers: Array.from({ length: RINGS + 1 }, () => new THREE.Vector3()),
    tangent: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    binormal: new THREE.Vector3(),
    point: new THREE.Vector3(),
    toHead: new THREE.Matrix4(),
    fromHead: new THREE.Matrix4(),
  });
  return { tail, bones };
}

/** Rebuild only tube positions/normals, reusing its topology, buffers and materials. */
export function animatePlayerTail(
  tail: THREE.Group,
  markers: THREE.Object3D[],
  head: THREE.Group,
  time: number,
  phase: number,
) {
  const s = states.get(tail)!;
  const root = tailRootMotion(time, phase),
    tip = tailTipDirection(time, phase);
  const sweep = -Math.sin(root.y);
  const points = s.curve.points;
  points[0].set(0, 0, 0);
  points[1].set(sweep * 9, 2 + root.x * 5, -Math.cos(root.y) * 9 + root.x * 3);
  points[2].set(sweep * 17, 10 + Math.sin(time * 1.2 + phase) * 0.6, -17);
  points[3].set(sweep * 21 + Math.sin(time * 1.3 + phase) * 0.7, 20, -24);
  points[4].set(
    points[3].x + tip.x * 4,
    25 + Math.sin(time * 0.8 + phase) * 0.6,
    -24 + tip.z * 4,
  );
  points[5].set(
    points[3].x + tip.x * 9,
    26 + Math.sin(time * 0.8 + phase) * 0.6,
    -24 + tip.z * 9,
  );
  s.curve.updateArcLengths();
  head.updateMatrix();
  tail.updateMatrix();
  s.toHead.copy(head.matrix).invert().multiply(tail.matrix);
  s.fromHead.copy(s.toHead).invert();
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS,
      p = s.centers[i],
      radius = 4.1 * (1 - t * 0.52);
    s.curve.getPointAt(t, p);
    // A padded ellipsoid, transformed with the current head pose. Push toward the rear,
    // reserving the whole tube radius as well as room for fur, helmet and animation.
    s.point.copy(p).applyMatrix4(s.toHead);
    const factor = 1 + (radius + 1.8) / 18,
      rx = 26 * factor,
      ry = 18 * factor,
      rz = 18 * factor;
    const cross = (s.point.x / rx) ** 2 + (s.point.y / ry) ** 2;
    if (cross < 1) {
      const rear = -rz * Math.sqrt(1 - cross);
      if (s.point.z > rear) {
        s.point.z = rear;
        p.copy(s.point).applyMatrix4(s.fromHead);
      }
    }
  }
  const position = s.mesh.geometry.getAttribute("position"),
    normals = s.mesh.geometry.getAttribute("normal");
  for (let i = 0; i <= RINGS; i++) {
    s.tangent
      .subVectors(
        s.centers[Math.min(RINGS, i + 1)],
        s.centers[Math.max(0, i - 1)],
      )
      .normalize();
    if (i === 0) s.normal.set(1, 0, 0);
    s.normal.addScaledVector(s.tangent, -s.normal.dot(s.tangent)).normalize();
    if (s.normal.lengthSq() < 0.01)
      s.normal
        .set(0, 0, 1)
        .addScaledVector(s.tangent, -s.tangent.z)
        .normalize();
    s.binormal.crossVectors(s.tangent, s.normal).normalize();
    const radius = 4.1 * (1 - (i / RINGS) * 0.52);
    for (let j = 0; j <= SIDES; j++) {
      const angle = (j / SIDES) * Math.PI * 2;
      s.point
        .copy(s.normal)
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(s.binormal, Math.sin(angle));
      const index = i * (SIDES + 1) + j;
      normals.setXYZ(index, s.point.x, s.point.y, s.point.z);
      s.point.multiplyScalar(radius).add(s.centers[i]);
      position.setXYZ(index, s.point.x, s.point.y, s.point.z);
    }
  }
  position.needsUpdate = normals.needsUpdate = true;
  s.cap.position.copy(s.centers[RINGS]);
  markers.forEach((marker, i) => {
    const ring = (i * RINGS) / 5;
    marker.position.copy(s.centers[ring]);
    s.tangent
      .subVectors(
        s.centers[Math.min(RINGS, ring + 1)],
        s.centers[Math.max(0, ring - 1)],
      )
      .normalize();
    marker.quaternion.setFromUnitVectors(s.point.set(0, 1, 0), s.tangent);
  });
}
