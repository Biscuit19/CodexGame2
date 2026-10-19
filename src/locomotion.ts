/** Screen/world angles increase clockwise. The cat's local +Z faces its aim. */
export function movementFrame(aim: number, movement: number) {
  const relative = Math.atan2(
    Math.sin(movement - aim),
    Math.cos(movement - aim),
  );
  const distance = Math.abs(relative);
  const kind =
    distance <= Math.PI / 4 + 1e-9
      ? "forward"
      : distance >= (3 * Math.PI) / 4 - 1e-9
        ? "backward"
        : relative > 0
          ? "right"
          : "left";
  return {
    kind,
    relative,
    forward: Math.cos(relative),
    side: -Math.sin(relative),
  } as const;
}

/** Roll about a ground-plane axis perpendicular to travel; never spin about vertical Y. */
export function rollAxis(aim: number, movement: number) {
  const frame = movementFrame(aim, movement);
  return { x: frame.forward, y: 0, z: -frame.side };
}
