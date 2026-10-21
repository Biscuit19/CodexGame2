import { test, expect } from "@playwright/test";

test("已选音效八条可播放；连发重复单发、射速可调、停止与音量正常", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__burstSources = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      (window as any).__burstSources.push(this);
      return start.apply(this, args as [number]);
    };
  });
  await page.goto("/audio-review/selected/index.html");
  await expect(page.locator(".card")).toHaveCount(4);
  await expect(page.locator("audio")).toHaveCount(8);
  await expect(page.locator("#volume")).toHaveValue("100");
  expect(
    await page
      .locator("audio")
      .evaluateAll((as) =>
        as.every((a) => (a as HTMLAudioElement).volume === 1),
      ),
  ).toBe(true);
  const reload = page.getByRole("button", { name: "停止全部" });
  const native = page.getByLabel("冲锋枪 换弹", { exact: true });
  await native.click({ position: { x: 20, y: 20 } });
  await expect(native).toHaveJSProperty("paused", false);
  await page.locator("#rounds").selectOption("3");
  await expect(native).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "连发试听", exact: true }).click();
  await expect(page.locator("#status")).toHaveAttribute(
    "data-state",
    "playing",
  );
  await expect(page.locator("#status")).toContainText(
    "冲锋枪 · 连发 3 发 · 720 发／分",
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).__burstSources.length))
    .toBe(1);
  const burst = await page.evaluate(() => {
    const b = (window as any).__burstSources[0].buffer as AudioBuffer;
    return { duration: b.duration, channels: b.numberOfChannels };
  });
  expect(burst.duration).toBeCloseTo(2 + 2 / 12, 3);
  expect(burst.channels).toBe(2);
  await page.locator("#volume").evaluate((e: HTMLInputElement) => {
    e.value = "40";
    e.dispatchEvent(new Event("input"));
  });
  expect(
    await page
      .locator("audio")
      .evaluateAll((as) =>
        as.every((a) => Math.abs((a as HTMLAudioElement).volume - 0.4) < 0.001),
      ),
  ).toBe(true);
  await reload.click();
  await expect(page.locator("#status")).toHaveText("已停止全部。");
  await expect(page.locator("#play-burst")).toBeEnabled();
  await page.locator("#weapon").selectOption("rifle");
  await expect(page.locator("#rpm")).toHaveValue("600");
  await page.locator("#rpm").fill("900");
  await page.getByRole("button", { name: "连发试听", exact: true }).click();
  await expect(page.locator("#status")).toContainText(
    "步枪 · 连发 3 发 · 900 发／分",
  );
  await reload.click();
  await page.locator("#rpm").fill("0");
  await page.getByRole("button", { name: "连发试听", exact: true }).click();
  await expect(page.locator("#status")).toHaveAttribute("data-state", "error");

  const check = await page.evaluate(async () => {
    const d = await (await fetch("manifest.json")).json(),
      ctx = new AudioContext();
    let decoded = 0;
    for (const t of Object.values(d.tracks) as any[]) {
      const response = await fetch(t.url);
      if (!response.ok) throw Error(t.url);
      const b = await ctx.decodeAudioData(await response.arrayBuffer());
      if (
        Math.abs(b.duration - t.duration) > 1 / 1000 ||
        b.numberOfChannels !== 2
      )
        throw Error(t.url);
      decoded++;
    }
    await ctx.close();
    const { makeBurst } = await import(
      /* @vite-ignore */ new URL("burst.js", location.href).pathname
    );
    const offline = new OfflineAudioContext(2, 44100, 44100),
      single = offline.createBuffer(2, 22050, 44100);
    single.getChannelData(0).fill(0.6);
    single.getChannelData(1).fill(-0.3);
    const result = makeBurst(offline, single, 1200, 20);
    let peak = 0;
    for (let c = 0; c < 2; c++)
      for (const x of result.buffer.getChannelData(c))
        peak = Math.max(peak, Math.abs(x));
    return {
      decoded,
      sameReload:
        d.tracks["reload-smg"].sha256 === d.tracks["reload-rifle"].sha256,
      shotCut: d.cuts["shot-sniper"].start,
      prefixCut: d.cuts["reload-shotgun-first"].end,
      peak,
      gain: result.gain,
      deferred: d.previewOnly,
    };
  });
  expect(check.decoded).toBe(8);
  expect(check.sameReload).toBe(true);
  expect(check.shotCut).toBe(2.03);
  expect(check.prefixCut).toBe(1.8);
  expect(check.peak).toBeLessThanOrEqual(10 ** (-1 / 20) + 0.000001);
  expect(check.gain).toBeLessThan(1);
  expect(check.deferred).toBe(true);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("tricat.")),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/chrome-selected-audio-desktop.png",
  });
});

test("已选音效手机布局可见，枪声和拼接换弹的来源清晰", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/selected/index.html");
  await expect(page.locator(".card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#card-sniper").scrollIntoViewIfNeeded();
  await expect(page.locator("#card-sniper")).toContainText("含弹壳尾声");
  await expect(page.locator("#card-shotgun")).toContainText("前 1.8 秒");
  const download = page.waitForEvent("download");
  await page.locator("#card-sniper a[download]").first().click();
  expect((await download).suggestedFilename()).toMatch(
    /^shot-sniper-[a-f0-9]+\.wav$/,
  );
  await page.screenshot({
    path: "test-results/chrome-selected-audio-mobile.png",
  });
});
