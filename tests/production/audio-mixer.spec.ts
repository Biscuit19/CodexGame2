import { test, expect } from "@playwright/test";
test("生产构建的独立调音页能载入共享脚本、50音效及完整BGM", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/audio-mixer/index.html");
  await page.getByRole("button", { name: "播放背景音乐", exact: true }).click();
  await page.evaluate(async () => {
    await (window as any).__audioMixer.sound.prepare();
  });
  expect(
    await page.evaluate(() => (window as any).__audioMixer.sound.buffers.size),
  ).toBe(50);
  await expect
    .poll(() =>
      page.evaluate(
        () => !(window as any).__audioMixer.sound.musicElement.paused,
      ),
    )
    .toBe(true);
  await page
    .locator("[data-key=buy]")
    .getByRole("button", { name: "试听", exact: true })
    .click();
  expect(errors).toEqual([]);
  await page.goto("/audio-review/soft-clicks/index.html");
  await expect(page.locator("#groups .card")).toHaveCount(15);
  await page
    .locator("[data-id=SC4] audio")
    .first()
    .evaluate((a: any) => a.play());
  expect(errors).toEqual([]);
});
