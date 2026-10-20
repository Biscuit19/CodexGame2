import { test, expect } from "@playwright/test";

test("五位作者原声可播放、互斥、停止、音量切换与下载；46条文件真实解码", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/audio-review/manifest.json", (route) =>
    route.fulfill({ json: { version: 1, sets: [] } }),
  );
  await page.goto("/audio-review/index.html");
  await expect(page.locator("#sets .set")).toHaveCount(5);
  await expect(page.locator("#sets audio")).toHaveCount(35);
  await expect(page.locator("#action-supplement audio")).toHaveCount(10);
  await expect(page.locator("#references audio")).toHaveCount(1);
  await expect(page.locator("#references audio")).toHaveAttribute(
    "src",
    "audio/A-shot-smg.mp3",
  );
  await page.evaluate(() => {
    (window as any).__reviewPlays = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__reviewPlays.push({ player: this, url: this.src });
      return play.call(this);
    };
  });
  await page.getByRole("tab", { name: "换弹", exact: true }).click();
  await expect(page.locator("#set-F .empty")).toContainText("没有此类声音");
  const first = page.locator("#set-E audio").first();
  await first.click({ position: { x: 20, y: 20 } });
  await expect(first).toHaveJSProperty("paused", false);
  const second = page.locator("#set-G audio").first();
  await second.click({ position: { x: 20, y: 20 } });
  await expect(second).toHaveJSProperty("paused", false);
  await expect(first).toHaveJSProperty("paused", true);
  const previewGain = await second.evaluate((a) =>
    Number((a as HTMLAudioElement).dataset.gain),
  );
  await page.locator("#volume").evaluate((el: any) => {
    el.value = "35";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(await second.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(
    0.35 * previewGain,
  );
  await page.locator("#level").uncheck();
  expect(await second.evaluate((a: HTMLAudioElement) => a.volume)).toBeCloseTo(
    0.35,
  );
  await page.locator("#level").check();
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  await expect(second).toHaveJSProperty("paused", true);
  await page.locator("#set-E").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/chrome-audio-review-reloads.png",
  });

  const download = page.waitForEvent("download");
  await page.locator("#set-E .clip-links a[download]").first().click();
  expect((await download).suggestedFilename()).toBe("E-ar-reload.mp3");
  await page.getByRole("tab", { name: "枪械射击", exact: true }).click();
  await page.evaluate(() => {
    (window as any).__reviewPlays = [];
  });
  await page
    .getByRole("button", { name: "连播五位作者代表枪声", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__reviewPlays.length), {
      timeout: 16000,
    })
    .toBe(2);
  expect(
    await page.evaluate(() =>
      (window as any).__reviewPlays.map((p: any) => p.url.split("/").at(-1)),
    ),
  ).toEqual(["E-556.mp3", "F-ar15.mp3"]);
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  expect(
    await page.evaluate(() =>
      (window as any).__reviewPlays.every((p: any) => p.player.paused),
    ),
  ).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).__reviewPlays.length)).toBe(
    2,
  );

  const result = await page.evaluate(async () => {
    const d = await (await fetch("manifest-v2.json")).json(),
      ctx = new AudioContext();
    const all = [...d.tracks, ...d.references];
    let count = 0;
    for (let i = 0; i < all.length; i += 6)
      await Promise.all(
        all.slice(i, i + 6).map(async (t: any) => {
          const response = await fetch(t.url);
          if (!response.ok) throw Error(t.url);
          const b = await ctx.decodeAudioData(await response.arrayBuffer());
          if (
            Math.abs(b.duration - t.duration) > 0.2 ||
            b.numberOfChannels !== t.channels
          )
            throw Error(t.url);
          count++;
        }),
      );
    await ctx.close();
    return {
      count,
      preview: d.previewOnly,
      authors: new Set(d.sets.map((s: any) => s.author)).size,
      originalCopies: d.tracks.filter((t: any) => t.sourceSha256 === t.sha256)
        .length,
    };
  });
  expect(result).toEqual({
    count: 46,
    preview: true,
    authors: 5,
    originalCopies: 29,
  });
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("tricat.")),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("五组试听手机布局与动作原始用途说明清楚，无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/index.html");
  await expect(page.locator("#sets .set")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-audio-review-mobile.png",
  });
  await page.getByRole("tab", { name: "翻滚与装备", exact: true }).click();
  await expect(page.locator("#action-supplement")).toBeVisible();
  await expect(page.locator("#action-supplement audio")).toHaveCount(10);
  await expect(page.locator("#action-supplement")).toContainText(
    "不是完整翻滚",
  );
  await page.locator("#action-supplement .clips").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-audio-review-actions-mobile.png",
  });
});
