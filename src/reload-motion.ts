import type * as THREE from "three";
const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};
/** Pull out, hold, reseat, then return to aim. Time follows the actual reload. */
export function reloadPose(remaining: number, total: number) {
  if (remaining <= 0 || total <= 0)
    return { active: false, progress: 1, hold: 0, detached: 0 };
  const progress = Math.max(0, Math.min(1, 1 - remaining / total));
  const hold = smooth(progress / 0.14) * (1 - smooth((progress - 0.86) / 0.14));
  const detached =
    smooth((progress - 0.14) / 0.23) * (1 - smooth((progress - 0.58) / 0.23));
  return { active: true, progress, hold, detached };
}
export function animateReload(
  gun: THREE.Group,
  arms: THREE.Group[],
  remaining: number,
  total: number,
) {
  const p = reloadPose(remaining, total);
  gun.position.set(12 * p.hold, -7.5, 9);
  gun.rotation.set(0.16 * p.hold, 0, 0.14 * p.hold);
  const magazine = gun.getObjectByName("reload-magazine");
  if (magazine) {
    magazine.position.set(
      13 * p.detached,
      -10 - (magazine.userData.reloadDrop ?? 4) * p.detached,
      12 - 3 * p.detached,
    );
    magazine.rotation.z = -0.3 * p.detached;
  }
  const rest = (arms[1].userData.reloadRestPosition ??=
    arms[1].position.toArray()) as number[];
  arms[1].position.set(
    rest[0] - 12 * p.hold + 6 * p.detached,
    rest[1] - 8 * p.detached,
    rest[2] + 10 * p.hold,
  );
  if (p.active) {
    arms[0].rotation.x = -0.16 * p.hold;
    arms[0].rotation.z = 0.06;
    arms[1].rotation.set(-0.45 * p.hold + 0.16 * p.detached, 0, -0.55 * p.hold);
  }
  return p;
}
