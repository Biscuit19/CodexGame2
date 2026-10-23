import { test, expect } from "@playwright/test";
test("真实容器首次解锁不被装备/普通发现/声道上限打断；高等级优先低等级等待", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      s = g.sound;
    r.enemies = [];
    r.paused = true;
    g.save.collection = [];
    g.save.discovered = [];
    await s.prepare();
    g.events = [];
    const create = s.ctx.createBufferSource.bind(s.ctx);
    s.ctx.createBufferSource = () => {
      const n = create(),
        start = n.start.bind(n),
        stop = n.stop.bind(n);
      let entry: any;
      n.start = (...args: any[]) => {
        const key = [...s.buffers].find(([, b]: any) => b === n.buffer)?.[0];
        if (key) {
          entry = {
            key,
            start: args[0] || s.ctx.currentTime,
            duration: n.buffer.duration,
            stops: 0,
            ended: false,
          };
          g.events.push(entry);
          n.addEventListener("ended", () => (entry.ended = true));
        }
        return start(...args);
      };
      n.stop = (...args: any[]) => {
        if (entry) entry.stops++;
        return stop(...args);
      };
      return n;
    };
  });
  async function reveal(tier: number, weapon = false) {
    return page.evaluate(
      async ({ tier, weapon }) => {
        const g = (window as any).__game,
          r = g.raid,
          d = await import("/src/data.ts");
        r.search = undefined;
        r.inventory = false;
        r.walls = [];
        const id = weapon
          ? "w3"
          : Object.values(d.db).find(
              (v: any) => v.kind === "collectible" && v.tier === tier,
            )!.id;
        const item = d.makeItem(id),
          c = {
            x: r.p.x + 12,
            y: r.p.y,
            type: "box",
            name: "纸箱",
            items: [item],
            revealed: 0,
            open: false,
            locked: false,
            cooldown: 0,
          };
        r.containers = [c];
        r.interact();
        r.searchProgress = d.searchTime(item) - 0.001;
        r.paused = false;
        r.update(0.02, new Set(), { x: r.p.x + 200, y: r.p.y, down: false });
        r.paused = true;
        await new Promise((resolve) => setTimeout(resolve, 0));
        return id;
      },
      { tier, weapon },
    );
  }
  const four = await reveal(4);
  await expect(page.locator(".discovery-card")).toHaveAttribute(
    "data-item",
    four,
  );
  await reveal(1, true);
  expect(
    await page.evaluate(() => {
      const r = (window as any).__game.raid;
      return r.equipContainer(r.search.items[0].uid, "secondary");
    }),
  ).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.play("pack");
    for (let i = 0; i < 45; i++) s.play("shot", 1, { weaponClass: "smg" });
  });
  const five = await reveal(5);
  await expect(page.locator(".discovery-card")).toHaveAttribute(
    "data-item",
    five,
  );
  const low = await reveal(1);
  await expect(page.locator(".discovery-card")).toHaveAttribute(
    "data-item",
    five,
  );
  const voices = await page.evaluate(() =>
    (window as any).__game.events.filter((v: any) =>
      v.key.startsWith("unlock-"),
    ),
  );
  expect(voices.map((v: any) => v.key)).toEqual(["unlock-4", "unlock-5"]);
  expect(voices[1].start).toBeGreaterThanOrEqual(
    voices[0].start + voices[0].duration - 0.01,
  );
  expect(voices.every((v: any) => v.stops === 0)).toBe(true);
  await page.screenshot({ path: "test-results/unlock-protected.png" });
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.search = undefined;
    r.inventory = false;
    r.paused = false;
  });
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as any).__game.events
            .filter((v: any) => v.key.startsWith("unlock-"))
            .every((v: any) => v.ended && v.stops === 0),
        ),
      { timeout: 30000 },
    )
    .toBe(true);
  await expect(page.locator(".discovery-card")).toHaveAttribute(
    "data-item",
    low,
    { timeout: 25000 },
  );
  const repeated = await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    const fresh = g.raid.discover(
      d.makeItem(
        (
          Object.values(d.db).find(
            (v: any) => v.kind === "collectible" && v.tier === 5,
          ) as any
        ).id,
      ),
    );
    return fresh;
  });
  expect(repeated).toBe(false);
});
