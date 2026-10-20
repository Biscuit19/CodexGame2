import { test, expect } from "@playwright/test";
test("访问独立试听页不覆盖离线游戏首页，试听页和音频也可离线读取", async ({
  page,
  context,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto("/audio-review/index.html");
  await expect(page.locator(".set")).toHaveCount(4);
  await context.setOffline(true);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "新的游戏", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".set")).toHaveCount(0);
  await page.goto("/audio-review/");
  await expect(page.locator(".set")).toHaveCount(4);
  await page.getByRole("tab", { name: "换弹", exact: true }).click();
  const audio = page.locator(".set audio").first();
  await audio.click({ position: { x: 20, y: 20 } });
  await expect(audio).toHaveJSProperty("paused", false);
  await context.setOffline(false);
});
