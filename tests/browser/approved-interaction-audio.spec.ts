import { test, expect } from "@playwright/test";
test("所选交互声音：真实开盖、逐件揭示、入包与两刀交替使用正确音源", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(async () => {
    await (window as any).__game.sound.prepare();
  });
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  const result = await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      s = g.sound,
      d = await import("/src/data.ts");
    r.enemies = [];
    r.walls = [];
    r.paused = true;
    const records: string[] = [];
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      const key = [...s.buffers].find(([, b]: any) => b === this.buffer)?.[0];
      if (key) records.push(key);
      return orig.apply(this, args as [number]);
    };
    for (const type of [
      "box",
      "toolbox",
      "cooler",
      "trashcan",
      "basket",
      "litter",
      "cabinet",
      "medical",
      "weapon",
      "bed",
      "safe",
      "corpse",
    ]) {
      const c = {
        type,
        name: type,
        x: r.p.x + 12,
        y: r.p.y,
        items: [],
        revealed: 0,
        open: false,
        locked: false,
        cooldown: 0,
      };
      r.search = undefined;
      r.inventory = false;
      r.containers = [c];
      r.interact();
      r.interact();
      r.interact();
    }
    const opens = records.filter((x) => x.startsWith("open-"));
    r.interrupt();
    r.inventory = false;
    const ids = [1, 2, 3, 4, 5].map(
      (t) =>
        Object.values(d.db).find(
          (x: any) => x.kind === "collectible" && x.tier === t,
        )!.id,
    );
    const c = {
      type: "box",
      name: "纸箱",
      x: r.p.x + 12,
      y: r.p.y,
      items: ids.map((id) => d.makeItem(id)),
      revealed: 0,
      open: false,
      locked: false,
      cooldown: 0,
    };
    r.containers = [c];
    r.interact();
    r.paused = false;
    for (let i = 0; i < 1800 && c.revealed < 5; i++)
      r.update(1 / 60, new Set(), { x: r.p.x + 100, y: r.p.y, down: false });
    r.paused = true;
    const reveals = c.revealed;
    r.take(0);
    const emptyAfterFirstTake = c.items.length === 4;
    r.interrupt();
    r.inventory = false;
    r.paused = false;
    r.selectWeapon("melee");
    r.swingMelee();
    r.meleeCooldown = 0;
    r.swingMelee();
    r.selectWeapon("primary");
    r.paused = true;
    AudioBufferSourceNode.prototype.start = orig;
    return {
      opens,
      records,
      reveals,
      emptyAfterFirstTake,
      switchDuration: s.buffers.get("switch-melee").duration,
      tier4: s.buffers.get("food-tier4").duration,
    };
  });
  expect(result.opens).toEqual([
    "open-box",
    "open-toolbox",
    "open-cooler",
    "open-trashcan",
    "open-basket",
    "open-litter",
    "open-cabinet",
    "open-medical",
    "open-weapon",
    "open-bed",
    "open-safe",
    "open-corpse",
  ]);
  expect(result.reveals).toBe(5);
  expect(result.records.filter((x) => x.startsWith("discover-"))).toEqual([
    "discover-1",
    "discover-2",
    "discover-3",
    "discover-4",
    "discover-5",
  ]);
  expect(result.records).toContain("pack");
  expect(result.emptyAfterFirstTake).toBe(true);
  expect(result.records.slice(-4)).toEqual([
    "switch-melee",
    "melee-first",
    "melee-second",
    "equip-weapon",
  ]);
  expect(result.switchDuration).toBeCloseTo(0.3, 4);
  expect(result.tier4).toBeCloseTo(3, 4);
});
