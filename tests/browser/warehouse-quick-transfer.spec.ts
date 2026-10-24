import { test, expect } from "@playwright/test";
test("仓库双击/F优先空副武器；普通入包仅响一次pack且不叠UI点击", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.equipment.secondary = null;
    g.save.equipment.food = d.makeItem("f1");
    g.save.stash = [d.makeItem("w3"), d.makeItem("f1"), d.makeItem("f2")];
    g.events = [];
    const play = g.sound.play.bind(g.sound);
    g.sound.play = (n: string, ...args: any[]) => {
      g.events.push(n);
      play(n, ...args);
    };
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.evaluate(() => ((window as any).__game.events = []));
  await page.locator(".warehouse-grid [data-item=w3]").dblclick();
  expect(
    await page.evaluate(
      () => (window as any).__game.save.equipment.secondary?.id,
    ),
  ).toBe("w3");
  await page.evaluate(() => ((window as any).__game.events = []));
  await page.locator(".warehouse-grid [data-item=f1]").dblclick();
  expect(await page.evaluate(() => (window as any).__game.events)).toEqual([
    "pack",
  ]);
  await page.locator(".warehouse-grid [data-item=f2]").hover();
  await page.evaluate(() => ((window as any).__game.events = []));
  await page.keyboard.press("f");
  expect(await page.evaluate(() => (window as any).__game.events)).toEqual([
    "pack",
  ]);
  await page.screenshot({ path: "test-results/warehouse-transfer.png" });
});

test("基地点击SC6、战区点击仍是SC1", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  const keys = await page.evaluate(async () => {
    const s = (window as any).__game.sound;
    await s.prepare();
    const log: string[] = [];
    const original = s.ctx.createBufferSource.bind(s.ctx);
    s.ctx.createBufferSource = () => {
      const n = original(),
        start = n.start.bind(n);
      n.start = (...args: any[]) => {
        log.push([...s.buffers].find(([, b]: any) => b === n.buffer)?.[0]);
        return start(...args);
      };
      return n;
    };
    s.mode = "base";
    s.play("click");
    s.mode = "raid";
    s.play("click");
    return log;
  });
  expect(keys).toEqual(["click-base", "click"]);
});
