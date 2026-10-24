import { test, expect } from "@playwright/test";
test("生产构建的独立调音页能载入共享脚本、52音效及完整BGM", async ({
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
  ).toBe(52);
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

test("生产构建统一调整台展示当前数值并导出完整可应用配置", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/game-workbench/index.html");
  await expect(page.locator("[data-item-card]")).toHaveCount(21);
  const data = await page.evaluate(() => (window as any).__gameWorkbench);
  expect(data.catalog.entries.length).toBeGreaterThan(1500);
  await page.locator("[data-item-card=w3] summary").click();
  await expect(
    page.getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true }),
  ).toHaveValue("28");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部配置", exact: true }).click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/\d{8}T\d{6}_\d{3}\+0800\.json$/);
  const fs = await import("node:fs/promises");
  const contents = await fs.readFile((await d.path())!, "utf8");
  const profile = JSON.parse(contents);
  expect(profile.audio.samples.click).toBe(0.74);
  expect(profile.currentValues.items).toHaveLength(120);
  await fs.writeFile(
    test.info().outputPath("production-workbench-export.json"),
    contents,
  );
  await page.locator("[data-tab=audio]").click();
  const frame = page.frameLocator("#mixer");
  await frame
    .getByRole("button", { name: "播放背景音乐", exact: true })
    .click();
  await expect(
    frame.getByRole("slider", { name: "战区UI点击 · SC1 轻轻啵一下", exact: true }),
  ).toHaveValue("0.74");
  await page.screenshot({
    path: "test-results/production-workbench-audio.png",
  });
  expect(errors).toEqual([]);
});
