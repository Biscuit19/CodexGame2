import type { Raid, Enemy } from "./raid";
const CELL = 16;
const grids = new WeakMap<
  Raid,
  {
    width: number;
    height: number;
    walls: number;
    cols: number;
    rows: number;
    walk: Uint8Array;
  }
>();
/** Cached walkability and A* avoid scanning an entire 7500x6000 map for each enemy. */
export function routeVillage(r: Raid, e: Enemy, tx: number, ty: number) {
  let grid = grids.get(r);
  if (
    !grid ||
    grid.width !== r.width ||
    grid.height !== r.height ||
    grid.walls !== r.walls.length
  ) {
    const cols = Math.ceil(r.width / CELL),
      rows = Math.ceil(r.height / CELL),
      walk = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        walk[y * cols + x] = r.blocked(
          x * CELL + CELL / 2,
          y * CELL + CELL / 2,
          19,
        )
          ? 0
          : 1;
    grid = {
      width: r.width,
      height: r.height,
      walls: r.walls.length,
      cols,
      rows,
      walk,
    };
    grids.set(r, grid);
  }
  const { cols, rows, walk } = grid,
    index = (x: number, y: number) =>
      Math.floor(y / CELL) * cols + Math.floor(x / CELL);
  const start = index(e.x, e.y);
  let goal = index(tx, ty);
  if (!walk[goal]) {
    let best = Infinity;
    for (
      let y = Math.max(0, Math.floor(ty / CELL) - 3);
      y <= Math.min(rows - 1, Math.floor(ty / CELL) + 3);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(tx / CELL) - 3);
        x <= Math.min(cols - 1, Math.floor(tx / CELL) + 3);
        x++
      ) {
        const k = y * cols + x,
          d = Math.hypot(x * CELL + CELL / 2 - tx, y * CELL + CELL / 2 - ty);
        if (walk[k] && d < best) {
          best = d;
          goal = k;
        }
      }
  }
  const parent = new Int32Array(walk.length).fill(-1),
    cost = new Float32Array(walk.length).fill(Infinity),
    closed = new Uint8Array(walk.length);
  const heap: { k: number; f: number }[] = [];
  const h = (k: number) =>
    Math.abs((k % cols) - (goal % cols)) +
    Math.abs(Math.floor(k / cols) - Math.floor(goal / cols));
  const push = (k: number, f: number) => {
    let n = heap.length;
    heap.push({ k, f });
    while (n) {
      const p = (n - 1) >> 1;
      if (heap[p].f <= f) break;
      heap[n] = heap[p];
      n = p;
    }
    heap[n] = { k, f };
  };
  const pop = () => {
    const first = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let n = 0;
      while (n * 2 + 1 < heap.length) {
        let c = n * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1].f < heap[c].f) c++;
        if (heap[c].f >= last.f) break;
        heap[n] = heap[c];
        n = c;
      }
      heap[n] = last;
    }
    return first.k;
  };
  cost[start] = 0;
  push(start, h(start));
  let found = false;
  while (heap.length) {
    const k = pop();
    if (closed[k]) continue;
    closed[k] = 1;
    if (k === goal) {
      found = true;
      break;
    }
    const x = k % cols,
      y = Math.floor(k / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      if (!walk[n] || closed[n] || cost[k] + 1 >= cost[n]) continue;
      cost[n] = cost[k] + 1;
      parent[n] = k;
      push(n, cost[n] + h(n));
    }
  }
  const path: { x: number; y: number }[] = [];
  if (found)
    for (let n = goal; n !== start && n >= 0; n = parent[n])
      path.push({
        x: (n % cols) * CELL + CELL / 2,
        y: Math.floor(n / cols) * CELL + CELL / 2,
      });
  e.path = path.reverse();
}
