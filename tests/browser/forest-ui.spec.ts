import { test, expect } from "@playwright/test";
test("深绿功能基地与四图导览、原图动效和减少动态效果", async ({ page }) => {
  await page.goto("/?test=1");
  const painting = page.locator(".cover-painting");
  await expect(painting).toHaveJSProperty("complete", true);
  expect(
    await painting.evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("painting-drift");
  await page.getByRole("button", { name: "新的游戏", exact: true }).hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/forest-menu-hover.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await painting.evaluate((e) => getComputedStyle(e).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect(page.locator(".home-landscape")).toHaveCount(0);
  await expect(page.locator(".home-entry")).toHaveCount(3);
  for (const label of ["补给商店", "收藏图鉴"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("button", { name: "返回基地", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/forest-${label}.png` });
    await page.getByRole("button", { name: "返回基地", exact: true }).click();
  }
  await page.getByRole("button", { name: "准备出发", exact: true }).click();
  await expect(page.locator(".region-choice img")).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const card = page.locator(`[data-action="map-select"][data-id="${i}"]`);
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".equipment-advice")).toContainText(
      `推荐 ${["1~2", "2~3", "3~4", "3~4"][i]} 级装备`,
    );
    await expect(page.locator(".region-hero")).toHaveAttribute(
      "src",
      (await card.locator("img").getAttribute("src"))!,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/forest-maps-390.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator(".function-grid")).toBeVisible();
  await page.screenshot({
    path: "test-results/forest-base-390.png",
    fullPage: true,
  });
});
