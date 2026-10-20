import type { Container } from "./raid";
export const CONTAINER_HIGHLIGHT_RANGE = 168;
export const containerKinds = [
  "basket",
  "toolbox",
  "cooler",
  "trashcan",
  "box",
  "litter",
  "cabinet",
  "medical",
  "weapon",
  "bed",
  "safe",
  "corpse",
  "boss-corpse",
] as const;
export const highValueContainer = (c: Container) =>
  !!c.bossLoot || ["safe", "weapon", "bed"].includes(c.type);
export const containerKind = (c: Container) =>
  c.type === "corpse" && c.bossLoot
    ? "boss-corpse"
    : containerKinds.includes(c.type as any)
      ? c.type
      : "box";

/** Labels and outlines must become visible at exactly the same distance and line of sight. */
export const containerHighlighted = (c: Container, r: import("./raid").Raid) =>
  Math.hypot(c.x - r.p.x, c.y - r.p.y) < CONTAINER_HIGHLIGHT_RANGE &&
  r.lineClear(r.p.x, r.p.y, c.x, c.y);
export const containerOutlineWidth = (c: Container) =>
  highValueContainer(c) ? 3.4 : 2;
export const containerHighlightColor = (c: Container) =>
  highValueContainer(c) ? "#ffe044" : "#f7fbff";
