import { test, expect } from "@playwright/test";

test("新封面与基地：可读布局、整备出发流程、安全箱全部放回", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/?test=1");
  await expect(page.locator(".cover-title")).toContainText("三角猫");
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "test-results/home-title.png" });
  await page.getByRole("button", { name: "新的游戏", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "创建并进入基地" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home-new-game.png" });
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "继续游戏", exact: true }).click();
  await expect(page.locator(".save-list")).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByLabel("主音量", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/home-title-settings.png" });
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "战区地图", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "仓库配装", exact: true }).hover();
  await page.waitForTimeout(650);
  await page.screenshot({ path: "test-results/home-base.png" });
  await page.getByRole("button", { name: "仓库配装", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game;
    const { makeItem } = await import("/src/data.ts" as string);
    g.save.pack = [];
    g.save.secure = [makeItem("c1_1")];
    g.save.stash = [];
    g.render();
  });
  await expect(
    page.getByRole("button", { name: "全部放回", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "全部放回", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__game.save.secure.length),
  ).toBe(0);
  expect(
    await page.evaluate(() => (window as any).__game.save.stash.length),
  ).toBe(1);
  await page.getByRole("button", { name: "准备出发", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "出发准备", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home-departure.png" });
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  // Existing preflight confirmation remains authoritative.
  const confirmation = page.getByRole("button", {
    name: "继续前往",
    exact: true,
  });
  if (await confirmation.isVisible()) await confirmation.click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("基地窄屏、键盘焦点、减少动效与设置关闭", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "test-results/home-1100.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const entry = page.getByRole("button", { name: "仓库配装", exact: true });
  await entry.focus();
  expect(
    await entry.evaluate((e) => getComputedStyle(e).outlineStyle),
  ).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".scene-clouds")
      .evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.setViewportSize({ width: 640, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "准备出发", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "准备出发", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/home-640.png", fullPage: true });
});
