import { test, expect } from "@playwright/test";

test("生产静态路径可打开已选音效页，连发模块及WAV也可离线读取", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto("/audio-review/selected/index.html");
  await expect(page.locator(".card")).toHaveCount(4);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".card")).toHaveCount(4);
  await page.locator("#rounds").selectOption("3");
  await page.getByRole("button", { name: "连发试听", exact: true }).click();
  await expect(page.locator("#status")).toHaveAttribute(
    "data-state",
    "playing",
  );
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("已停止全部。");
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
