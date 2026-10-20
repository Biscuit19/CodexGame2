import { test, expect } from "@playwright/test";

test("批量出售选择框圆润且支持键盘与鼠标切换", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.getByRole("button", { name: "批量出售", exact: true }).click();
  const boxes = page.locator(".batch-item > input");
  const style = await boxes.first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { appearance: s.appearance, radius: s.borderRadius, width: s.width };
  });
  expect(style).toEqual({ appearance: "none", radius: "8px", width: "25px" });
  await boxes.first().click();
  await expect(boxes.first()).toBeChecked();
  await boxes.nth(1).focus();
  await page.keyboard.press("Space");
  await expect(boxes.nth(1)).toBeChecked();
  await expect(
    page.getByRole("button", { name: "出售所选（2）", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/chrome-rounded-sale-checkbox.png",
  });
  await boxes.first().click();
  await expect(boxes.first()).not.toBeChecked();
  await page.getByRole("button", { name: "退出批量出售", exact: true }).click();
  await expect(boxes).toHaveCount(0);
});

test("容器白金粗描边与名称同步，持刀抬起，战斗根节点隐藏鼠标及文本插入光标", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    r.enemies = [];
    r.walls = [];
    r.p.x = 900;
    r.p.y = 4800;
    r.activeWeapon = "melee";
    r.p.angle = Math.PI / 2;
    r.containers = [
      { type: "basket", name: "鸟窝", x: 800, y: 4680 },
      { type: "safe", name: "保险箱", x: 1000, y: 4680 },
    ].map((c) => ({
      ...c,
      open: false,
      items: [],
      revealed: 0,
      locked: false,
      cooldown: 0,
    }));
    g.labelCalls = [];
    const ctx = document
      .querySelector<HTMLCanvasElement>("#world")!
      .getContext("2d")!;
    const original = ctx.fillText.bind(ctx);
    ctx.fillText = (text, x, y, width?) => {
      g.labelCalls.push(text);
      if (width === undefined) original(text, x, y);
      else original(text, x, y, width);
    };
    g.renderer3d.camera.zoom = 2;
    g.renderer3d.camera.updateProjectionMatrix();
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return (
          g.raid.containers.every(
            (c: any) =>
              g.renderer3d.containers.get(c)?.group.userData.highlighted &&
              g.renderer3d.containers.get(c)?.group.userData.ready,
          ) && ["鸟窝", "保险箱"].every((name) => g.labelCalls.includes(name))
        );
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => {
      const g = (window as any).__game;
      return g.raid.containers.map(
        (c: any) =>
          g.renderer3d.containers.get(c).outlines[0].material.uniforms.width
            .value,
      );
    }),
  ).toEqual([2, 3.4]);
  expect(
    await page.evaluate(() => (window as any).__game.raid.near),
  ).toBeUndefined();
  const front = await page.evaluate(() => {
    const g = (window as any).__game;
    return g.renderer3d.project(g.raid.p.x, g.raid.p.y + 200, 0);
  });
  await page.mouse.move(front.x, front.y);
  for (const selector of ["html", "body", "#world", "#scene3d", ".raid-hud"]) {
    expect(
      await page.locator(selector).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.cursor, s.caretColor, s.userSelect];
      }),
    ).toEqual(["none", "rgba(0, 0, 0, 0)", "none"]);
  }
  await page.screenshot({
    path: "test-results/chrome-highlight-label-upright-knife.png",
  });
  const grip = await page.evaluate(() => {
    const k = (window as any).__game.renderer3d.actors
      .get("player")
      .knife.getObjectByName("cat-paw-knife");
    return { pitch: k.rotation.x, bank: k.rotation.z };
  });
  expect(grip.pitch).toBeLessThan(-0.5);
  expect(grip.pitch).toBeGreaterThan(-0.8);
  expect(Math.abs(grip.bank)).toBeLessThan(0.35);
  const side = await page.evaluate(() => {
    const g = (window as any).__game;
    return g.renderer3d.project(g.raid.p.x + 200, g.raid.p.y, 0);
  });
  await page.mouse.move(side.x, side.y);
  await page.waitForTimeout(150);
  await page.screenshot({ path: "test-results/chrome-upright-knife-side.png" });
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page.locator("html").evaluate((el) => getComputedStyle(el).cursor),
    )
    .not.toBe("none");
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector(".raid-shortcuts")!);
    window.getSelection()!.addRange(range);
  });
  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.rangeCount))
    .toBe(0);
  await expect
    .poll(() =>
      page.locator("html").evaluate((el) => getComputedStyle(el).cursor),
    )
    .toBe("none");
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.p.y += 300;
    g.labelCalls = [];
  });
  await expect
    .poll(() =>
      page.evaluate(() => {
        const g = (window as any).__game;
        return g.raid.containers.every(
          (c: any) =>
            !g.renderer3d.containers.get(c).group.userData.highlighted,
        );
      }),
    )
    .toBe(true);
  expect(
    await page.evaluate(() =>
      (window as any).__game.labelCalls.filter(
        (s: string) => s === "鸟窝" || s === "保险箱",
      ),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
