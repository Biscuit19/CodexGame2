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
  toPack: THREE.Matrix4;
  fromPack: THREE.Matrix4;
  packBounds: THREE.Box3;
  closest: THREE.Vector3;
};
const states = new WeakMap<THREE.Group, TailState>();

export function createPlayerTail(
  parent: THREE.Group,
  coat?: { fur: string; patch: string },
) {
  const tail = new THREE.Group();
  tail.name = "continuous-responsive-tail";
  tail.position.set(0, 5, -6);
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
  if (coat) {
    for (let i = 0; i <= RINGS; i++) {
      const c = new THREE.Color(i / RINGS > 0.86 ? coat.fur : coat.patch);
      for (let j = 0; j <= SIDES; j++)
        c.toArray(color, (i * (SIDES + 1) + j) * 3);
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
    new THREE.MeshStandardMaterial({
      color: coat?.fur || "#f5dfba",
      roughness: 0.95,
    }),
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
    toPack: new THREE.Matrix4(),
    fromPack: new THREE.Matrix4(),
    packBounds: new THREE.Box3(),
    closest: new THREE.Vector3(),
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
  pack?: THREE.Group,
  walk = 0,
) {
  const s = states.get(tail)!;
  const root = tailRootMotion(time, phase),
    tip = tailTipDirection(time, phase);
  if (walk) root.y += Math.sin(walk) * 0.14;
  const sweep = -Math.sin(root.y),
    bounce = walk ? Math.sin(walk * 2) * 1.0 : 0;
  const points = s.curve.points;
  points[0].set(0, 0, 0);
  // The first bend exits below the pack, then rises closer to the rump.
  points[1].set(
    sweep * 9,
    -0.8 + root.x * 5,
    -Math.cos(root.y) * 8 + root.x * 3,
  );
  points[2].set(
    sweep * 17,
    8 + Math.sin(time * 1.2 + phase) * 0.6 + bounce,
    -13,
  );
  points[3].set(
    sweep * 21 + Math.sin(time * 1.3 + phase) * 0.7,
    19 + bounce,
    -19,
  );
  points[4].set(
    points[3].x + tip.x * 4,
    23 + Math.sin(time * 0.8 + phase) * 0.6,
    -19 + tip.z * 4,
  );
  points[5].set(
    points[3].x + tip.x * 8,
    24 + Math.sin(time * 0.8 + phase) * 0.6,
    -19 + tip.z * 8,
  );
  s.curve.updateArcLengths();
  head.updateMatrix();
  tail.updateMatrix();
  s.toHead.copy(head.matrix).invert().multiply(tail.matrix);
  s.fromHead.copy(s.toHead).invert();
  if (pack?.visible) {
    pack.updateMatrix();
    s.toPack.copy(pack.matrix).invert().multiply(tail.matrix);
    s.fromPack.copy(s.toPack).invert();
    if (s.packBounds.isEmpty()) {
      // Pack mesh bounds are static in pack-local space; scale/pose are applied separately.
      for (const child of pack.children)
        if (child instanceof THREE.Mesh) {
          child.updateMatrix();
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          s.packBounds.union(
            child.geometry.boundingBox!.clone().applyMatrix4(child.matrix),
          );
        }
    }
  }
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
    if (pack?.visible) {
      s.point.copy(p).applyMatrix4(s.toPack);
      s.packBounds.clampPoint(s.point, s.closest);
      const distance = s.closest.distanceTo(s.point);
      const padding = (radius + 0.65) / pack.scale.x;
      if (distance < padding) {
        if (distance > 1e-6) {
          s.closest
            .sub(s.point)
            .multiplyScalar((padding - distance) / distance);
          s.point.sub(s.closest);
        } else {
          // If inside, leave through the bottom, rear or nearest side, never the top/front.
          const exits = [
            {
              axis: "y" as const,
              value: s.packBounds.min.y - padding,
              distance: s.point.y - s.packBounds.min.y,
            },
            {
              axis: "z" as const,
              value: s.packBounds.min.z - padding,
              distance: s.point.z - s.packBounds.min.z,
            },
            {
              axis: "x" as const,
              value: s.packBounds.min.x - padding,
              distance: s.point.x - s.packBounds.min.x,
            },
            {
              axis: "x" as const,
              value: s.packBounds.max.x + padding,
              distance: s.packBounds.max.x - s.point.x,
            },
          ];
          const exit = exits.reduce((a, b) =>
            a.distance < b.distance ? a : b,
          );
          s.point[exit.axis] = exit.value;
        }
        p.copy(s.point).applyMatrix4(s.fromPack);
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
        .multiplyScalar(-Math.cos(angle))
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
