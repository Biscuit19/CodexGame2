import { test, expect } from "@playwright/test";

test("生产试听页保留相对资源路径与授权，候选不进入游戏预缓存", async ({
  page,
  request,
}) => {
  await page.goto("/audio-review/actions/index.html");
  await expect(page.locator(".candidate")).toHaveCount(5);
  await page.getByRole("button", { name: "试听 R2", exact: true }).click();
  await expect(page.locator("#status")).toContainText("正在试听 R2");
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).not.toContain("audio-review/actions/");
  const credits = await request.get(
    "/audio-review/actions/licenses/index.html",
  );
  expect(credits.ok()).toBe(true);
  expect(await credits.text()).toContain("Gary");
  for (const file of [
    "CC-BY-3.0.txt",
    "CC-BY-SA-3.0.txt",
    "CC-BY-4.0.txt",
    "FilmCow-license.pdf",
  ]) {
    const response = await request.get(
      "/audio-review/actions/licenses/" + file,
    );
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(1000);
  }
});
