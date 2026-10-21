import { test, expect } from "@playwright/test";

test("交互音效试听：115候选解码、选择复制、组合时序与停止", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__voices = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      const record = {
        at: args[0] || 0,
        loop: this.loop,
        duration: this.buffer?.duration,
        ended: false,
      };
      this.addEventListener("ended", () => {
        record.ended = true;
      });
      (window as any).__voices.push(record);
      return start.apply(this, args as [number]);
    };
  });
  await page.goto("/audio-review/interactions/index.html");
  await expect(page.locator("#categories button")).toHaveCount(23);
  await expect(page.locator(".candidate")).toHaveCount(5);
  await expect(page.locator("#volume")).toHaveValue("100");
  await page.getByRole("button", { name: "试听 RE1", exact: true }).click();
  await expect(page.locator("#status")).toContainText("正在试听 RE1");
  await page.locator("#stop").click();
  await page.getByRole("button", { name: "选择 RE1", exact: true }).click();
  await page.locator('[data-category="burp"]').click();
  await page.getByRole("button", { name: "选择 BU2", exact: true }).click();
  await page.locator('[data-category="meal4"]').click();
  await page.getByRole("button", { name: "选择 ME2", exact: true }).click();
  await page.locator("#version").selectOption("1");
  await page.getByRole("button", { name: "选择 ME3", exact: true }).click();
  await page.locator("#meal-time").selectOption("1");
  await page.locator("#meal-demo").click();
  await expect(page.locator("#status")).toContainText("ME3 ＋ BU2");
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(3);
  const meal = await page.evaluate(() => (window as any).__voices.slice(-2));
  expect(meal[1].at - meal[0].at).toBeCloseTo(1.9, 5);
  await page.locator("#stop").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((v: any) => v.ended)),
    )
    .toBe(true);
  await page.locator("#knife-demo").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(8);
  const knife = await page.evaluate(() => (window as any).__voices.slice(-5));
  expect(knife[4].at - knife[0].at).toBeCloseTo(1.8, 5);
  await page.locator("#stop").click();
  await page.locator("#search-time").selectOption("2");
  await page.locator("#search-demo").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(11);
  const search = await page.evaluate(() => (window as any).__voices.slice(-3));
  expect(search[0].loop).toBe(true);
  expect(search[1].at - search[0].at).toBeCloseTo(2.12, 5);
  await page.locator('[data-category="box"]').click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((v: any) => v.ended)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "选择 BX1", exact: true }).click();
  await page.locator("#rarity-demo").click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(15);
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((v: any) => v.ended)),
    )
    .toBe(true);
  await page.locator(".candidate details summary").first().click();
  expect(
    await page
      .locator("audio")
      .first()
      .evaluate((a: HTMLAudioElement) => a.volume),
  ).toBe(1);
  const original = page.locator("audio").first();
  await original.evaluate((a: HTMLAudioElement) => a.play());
  await expect(original).toHaveJSProperty("paused", false);
  await page.getByRole("button", { name: "试听 BX1", exact: true }).click();
  await expect(original).toHaveJSProperty("paused", true);
  await page.locator("#stop").click();
  const decoded = await page.evaluate(async () => {
    const m = await (await fetch("manifest-v1.json")).json();
    if (!m.previewOnly || m.installedToGame) throw Error("Preview isolation");
    const entries: any[] = Object.values(m.sources);
    for (const g of m.groups) {
      if (g.candidates.length !== 5) throw Error(g.id);
      const unique = new Set(
        g.candidates.map((c: any) => c.versions[0].parts[0].source),
      );
      if (unique.size !== 5) throw Error("Duplicate " + g.id);
      for (const c of g.candidates) for (const v of c.versions) entries.push(v);
    }
    const ctx = new AudioContext();
    for (const e of entries) {
      const response = await fetch(e.url);
      if (!response.ok) throw Error(e.url);
      const bytes = await response.arrayBuffer();
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (b) => b.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== e.sha256) throw Error("Hash " + e.url);
      const decoded = await ctx.decodeAudioData(bytes);
      if (
        Math.abs(decoded.duration - e.duration) > 0.001 ||
        decoded.numberOfChannels !== 2
      )
        throw Error("Decode " + e.url);
    }
    await ctx.close();
    return entries.length;
  });
  expect(decoded).toBe(220);
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(
    /RE1[\s\S]*BU2[\s\S]*ME2[\s\S]*ME3[\s\S]*BX1/,
  );
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/chrome-interaction-audio-desktop.png",
    fullPage: true,
  });
});

test("交互音效试听手机：分类与复制弹窗无横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/interactions/index.html");
  await expect(page.locator(".candidate")).toHaveCount(5);
  await page.locator('[data-category="bossbox"]').click();
  await page.getByRole("button", { name: "选择 BL3", exact: true }).click();
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(/BL3/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-interaction-audio-mobile.png",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
});
