import type { Group } from "three";

const ease = (t: number) => t * t * (3 - 2 * t);
/** A short wind-up, a cross-body diagonal cut, then a smooth return to the held pose. */
export function knifeSwingPose(cooldown: number, swing: number) {
  const t = Math.max(0, Math.min(1, 1 - cooldown / 0.45));
  const side = swing % 2 ? 1 : -1;
  let sweep = 0,
    lift = 0,
    reach = 0;
  if (cooldown > 0 && t < 0.2) {
    const a = ease(t / 0.2);
    sweep = -0.65 * a;
    lift = 0.1 * a;
  } else if (cooldown > 0 && t < 0.64) {
    const a = ease((t - 0.2) / 0.44);
    sweep = -0.65 + 1.5 * a;
    lift = 0.1 - 0.3 * a;
    reach = Math.sin(a * Math.PI);
  } else if (cooldown > 0) {
    const a = 1 - ease((t - 0.64) / 0.36);
    sweep = 0.85 * a;
    lift = -0.2 * a;
  }
  return {
    yaw: sweep * side,
    pitch: -lift,
    bank: sweep * side * -0.23,
    reach,
    shoulder: sweep * side * 0.38,
  };
}
export function animateKnifeHold(
  knife: Group,
  arm: Group,
  cooldown: number,
  swing: number,
) {
  const p = knifeSwingPose(cooldown, swing);
  knife.position.set(0, -8.5 - p.reach * 1.5, 12 + p.reach * 4);
  knife.rotation.set(p.pitch, p.yaw, p.bank);
  if (knife.visible) {
    arm.rotation.y = p.shoulder;
    arm.rotation.x += p.pitch * 0.5;
    arm.rotation.z += p.bank * 0.4;
  }
}
