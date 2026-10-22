import { test, expect } from "@playwright/test";
test("保险箱本局复开和答错不换题；猫叫触发与发现增益真实播放正确", async ({
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
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.walls = [];
    r.containers = [
      {
        x: r.p.x + 10,
        y: r.p.y,
        type: "safe",
        name: "保险箱",
        items: [],
        open: false,
        revealed: 0,
        locked: true,
        cooldown: 0,
      },
    ];
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator(".puzzle-panel")).toBeVisible();
  const question = await page.locator(".math-expression").innerText();
  const choices = await page.locator(".math-choices strong").allTextContents();
  await page.keyboard.press("Escape");
  await expect(page.locator(".puzzle-panel")).toHaveCount(0);
  await page.keyboard.press("KeyE");
  await expect(page.locator(".math-expression")).toHaveText(question);
  expect(await page.locator(".math-choices strong").allTextContents()).toEqual(
    choices,
  );
  const wrong = await page.evaluate(() => {
    const p = (window as any).__game.raid.puzzle;
    return p.choices.find((n: number) => n !== p.answer);
  });
  await page.locator(`.math-choices [data-id="${wrong}"]`).click();
  await expect(page.locator(".puzzle-panel")).toHaveCount(0);
  await page.evaluate(() => {
    (window as any).__game.raid.containers[0].cooldown = 0;
  });
  await page.keyboard.press("KeyE");
  await expect(page.locator(".math-expression")).toHaveText(question);
  expect(await page.locator(".math-choices strong").allTextContents()).toEqual(
    choices,
  );
  await page.screenshot({
    path: "test-results/chrome-safe-fixed-question.png",
  });
  await page.keyboard.press("Escape");
  const data = await page.evaluate(async () => {
    const g = (window as any).__game,
      s = g.sound,
      r = g.raid,
      d = await import("/src/data.ts");
    r.enemies = [];
    r.paused = true;
    s.stopSamples();
    const log: any[] = [];
    const create = s.ctx.createBufferSource.bind(s.ctx);
    s.ctx.createBufferSource = () => {
      const n = create();
      const start = n.start.bind(n),
        connect = n.connect.bind(n);
      let gain: any;
      n.connect = (target: any) => {
        gain = target;
        return connect(target);
      };
      n.start = (...a: any[]) => {
        const key = [...s.buffers].find(([, b]: any) => b === n.buffer)?.[0];
        log.push({ key, gain: gain.gain.value });
        return start(...a);
      };
      return n;
    };
    r.p.hp = 100;
    r.hurtPlayer(1, 1);
    r.hurtPlayer(1, 1);
    const e = r.spawn(r.p.x + 100, r.p.y, 0, 1);
    e.state = "patrol";
    r.engage(e);
    r.engage(e);
    for (const tier of [3, 4, 5]) s.play("loot", tier);
    const low: any[] = [];
    s.note = (...args: any[]) => low.push(args);
    s.play("loot", 1);
    s.play("loot", 2);
    return { log, low, bank: s.buffers.size };
  });
  expect(data.bank).toBe(43);
  expect(data.log.filter((x: any) => x.key === "hurt")).toEqual([
    { key: "hurt", gain: 0.5 },
  ]);
  const calls = data.log.filter((x: any) => x.key?.startsWith("enemy-alert-"));
  expect(calls).toHaveLength(1);
  expect(calls[0].key).toMatch(/^enemy-alert-[1-4]$/);
  expect(calls[0].gain).toBeCloseTo(0.65, 6);
  const discoveries = data.log.filter((x: any) =>
    x.key?.startsWith("discover-"),
  );
  expect(discoveries).toHaveLength(3);
  for (const item of discoveries) expect(item.gain).toBeCloseTo(1.2, 6);
  expect(data.low.map((a: any) => a[3])).toEqual([0.12, 0.12]);
});
