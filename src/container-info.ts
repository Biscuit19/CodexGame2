import type { Container } from "./raid";
export const containerKinds = [
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
