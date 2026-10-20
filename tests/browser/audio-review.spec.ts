import { test, expect } from "@playwright/test";
test("四套试听页逐项播放、对比连播、停止和下载可用，全部音频可真实解码", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/audio-review/index.html");
  await expect(page.locator(".set")).toHaveCount(4);
  await expect(page.locator(".set audio")).toHaveCount(16);
  await page.evaluate(() => {
    (window as any).__reviewPlays = [];
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__reviewPlays.push({ player: this, url: this.src });
      return original.call(this);
    };
  });
  await page.getByRole("tab", { name: "换弹", exact: true }).click();
  const first = page.locator(".set[data-set=A] audio").first();
  await first.click({ position: { x: 20, y: 20 } });
  await expect(first).toHaveJSProperty("paused", false);
  const second = page.locator(".set[data-set=B] audio").first();
  await second.click({ position: { x: 20, y: 20 } });
  await expect(second).toHaveJSProperty("paused", false);
  await expect(first).toHaveJSProperty("paused", true);
  await page.locator("#volume").evaluate((el: any) => {
    el.value = "35";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(await second.evaluate((el: any) => el.volume)).toBe(0.35);
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  await expect(second).toHaveJSProperty("paused", true);
  await page.screenshot({
    path: "test-results/chrome-audio-review-desktop.png",
    fullPage: true,
  });
  await page.evaluate(() => {
    (window as any).__reviewPlays = [];
  });
  await page.locator("#compare-item").selectOption("shot-smg");
  await page.getByRole("button", { name: "依次对比四套", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__reviewPlays.length), {
      timeout: 8000,
    })
    .toBe(4);
  const urls = await page.evaluate(() =>
    (window as any).__reviewPlays.map((p: any) => p.url),
  );
  expect(urls.map((u: string) => u.split("/").at(-1))).toEqual([
    "A-shot-smg.mp3",
    "B-shot-smg.mp3",
    "C-shot-smg.mp3",
    "D-shot-smg.mp3",
  ]);
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__reviewPlays.every((p: any) => p.player.paused),
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "枪械射击", exact: true }).click();
  await page.locator("#burst").check();
  expect(
    await page.locator(".set audio").first().getAttribute("src"),
  ).toContain("burst-smg");
  const downloadPromise = page.waitForEvent("download");
  await page.locator(".set[data-set=D] a.zip").click();
  expect((await downloadPromise).suggestedFilename()).toBe("方案D.zip");
  const result = await page.evaluate(async () => {
    const d = await (await fetch("manifest.json")).json(),
      ctx = new AudioContext();
    let count = 0;
    const tracks = [...d.tracks, ...d.references];
    for (let i = 0; i < tracks.length; i += 6)
      await Promise.all(
        tracks.slice(i, i + 6).map(async (t: any) => {
          const b = await ctx.decodeAudioData(
            await (await fetch(t.url)).arrayBuffer(),
          );
          if (b.duration <= 0 || b.numberOfChannels !== 1) throw Error(t.url);
          count++;
        }),
      );
    await ctx.close();
    return { count, preview: d.previewOnly };
  });
  expect(result).toEqual({ count: 68, preview: true });
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("tricat.")),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});
test("独立试听页在手机尺寸下无横向溢出，每套动作音效可查看", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/index.html");
  await expect(page.locator(".set")).toHaveCount(4);
  await page.getByRole("tab", { name: "装备与动作", exact: true }).click();
  expect(await page.locator(".set audio").count()).toBe(16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-audio-review-mobile.png",
    fullPage: true,
  });
});
