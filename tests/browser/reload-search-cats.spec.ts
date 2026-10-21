import { test, expect } from "@playwright/test";
test("新一轮试听：40候选解码、低音量循环、猫叫多选随机与复制", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__voices = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      const r = {
        loop: this.loop,
        rate: this.playbackRate.value,
        duration: this.buffer?.duration,
        ended: false,
      };
      this.addEventListener("ended", () => {
        r.ended = true;
      });
      (window as any).__voices.push(r);
      return start.apply(this, args as [number]);
    };
  });
  await page.goto("/audio-review/reload-search-cats/index.html");
  await expect(page.locator("#categories button")).toHaveCount(4);
  await expect(page.locator(".candidate")).toHaveCount(10);
  await expect(page.locator("#volume")).toHaveValue("100");
  await page.getByRole("button", { name: "选择 NR2", exact: true }).click();
  await page.locator("#reload-time").selectOption("2.5");
  await page.getByRole("button", { name: "试听 NR2", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(1);
  const reload = await page.evaluate(() => (window as any).__voices[0]);
  expect(reload.duration / reload.rate).toBeCloseTo(2.5, 5);
  await page.locator('[data-category="search"]').click();
  await page.getByRole("button", { name: "试听 LS1", exact: true }).click();
  await expect(page.locator("#status")).toContainText("循环试听");
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(2);
  expect(await page.evaluate(() => (window as any).__voices[1].loop)).toBe(
    true,
  );
  await page.getByRole("button", { name: "选择 LS1", exact: true }).click();
  await page.locator('[data-category="player-hurt"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((v: any) => v.ended)),
    )
    .toBe(true);
  await page.locator("#family").click();
  await expect(page.locator(".candidate.chosen")).toHaveCount(5);
  await page.getByRole("button", { name: "选择 PH6", exact: true }).click();
  await expect(page.locator(".candidate.chosen")).toHaveCount(6);
  await page.locator("#random").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBeGreaterThan(2);
  await page.locator("#stop").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((v: any) => v.ended)),
    )
    .toBe(true);
  await page.locator('[data-category="enemy-alert"]').click();
  await page.locator("#family").click();
  await expect(page.locator(".candidate.chosen")).toHaveCount(5);
  await page.locator("#export").click();
  await expect(page.locator("#copy-text")).toHaveValue(
    /NR2[\s\S]*LS1[\s\S]*PH1[\s\S]*PH5[\s\S]*PH6[\s\S]*EA1[\s\S]*EA5/,
  );
  await page.keyboard.press("Escape");
  const counts = await page.evaluate(async () => {
    const m = await (await fetch("manifest-v1.json")).json();
    if (!m.previewOnly || m.installedToGame) throw Error("Preview isolation");
    const ctx = new AudioContext();
    let count = 0;
    for (const g of m.groups) {
      if (g.candidates.length !== 10) throw Error(g.id);
      if (
        new Set(g.candidates.map((c: any) => c.versions[0].parts[0].source))
          .size !== 10
      )
        throw Error("Duplicate recording");
      for (const c of g.candidates)
        for (const v of c.versions) {
          if (g.id === "search" && v.peak > 0.27)
            throw Error("Search too loud");
        }
    }
    const es = [
      ...Object.values(m.sources),
      ...m.groups.flatMap((g: any) =>
        g.candidates.flatMap((c: any) => c.versions),
      ),
    ] as any[];
    for (const e of es) {
      const r = await fetch(e.url);
      if (!r.ok) throw Error(e.url);
      const b = await r.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", b)),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      if (hash !== e.sha256) throw Error("Hash " + e.url);
      const a = await ctx.decodeAudioData(b);
      if (Math.abs(a.duration - e.duration) > 0.001 || a.numberOfChannels !== 2)
        throw Error("Decode " + e.url);
      count++;
    }
    await ctx.close();
    return count;
  });
  expect(counts).toBe(80);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/chrome-next-audio-desktop.png",
    fullPage: true,
  });
});
test("新一轮试听手机：多选与复制弹窗可见无溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/reload-search-cats/index.html");
  await expect(page.locator(".candidate")).toHaveCount(10);
  await page.locator('[data-category="player-hurt"]').click();
  await page.locator("#family").click();
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(/PH1[\s\S]*PH5/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/chrome-next-audio-mobile.png" });
});
