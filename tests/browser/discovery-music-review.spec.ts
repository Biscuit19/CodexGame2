import { test, expect } from "@playwright/test";
test("新发现与完整音乐：20原件、作者去重、播放停止与复制选择", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/audio-review/discovery-music/index.html");
  await expect(page.locator("#categories button")).toHaveCount(2);
  await expect(page.locator(".candidate")).toHaveCount(10);
  await expect(page.locator("#volume")).toHaveValue("100");
  await expect(page.locator("#gun-controls")).toBeHidden();
  await page.getByRole("button", { name: "选择 ND1", exact: true }).click();
  await page.getByRole("button", { name: "选择 ND4", exact: true }).click();
  await page.getByRole("button", { name: "发现试听 ND1", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("试听结束。");
  await page.locator("#sequence").click();
  await page.locator("#stop").click();
  await expect(page.locator("#sequence")).toBeEnabled();
  await page.locator('[data-category="music"]').click();
  await page.getByRole("button", { name: "选择 NB1", exact: true }).click();
  await page.getByRole("button", { name: "选择 NB5", exact: true }).click();
  await page
    .getByRole("button", { name: "播放完整曲 NB1", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator('audio[data-candidate="NB1"]')
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .locator('audio[data-candidate="NB1"]')
    .evaluate((a: HTMLAudioElement) => (a.currentTime = 20));
  await expect
    .poll(() =>
      page
        .locator('audio[data-candidate="NB1"]')
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThanOrEqual(20);
  await page.locator("#stop").click();
  expect(
    await page
      .locator('audio[data-candidate="NB1"]')
      .evaluate((a: HTMLAudioElement) => a.paused),
  ).toBe(true);
  const checked = await page.evaluate(async () => {
    const m = await (await fetch("manifest-v1.json")).json(),
      ctx = new AudioContext();
    if (new Set(Object.values(m.sources).map((s: any) => s.source)).size !== 20)
      throw Error("Duplicate source");
    for (const g of m.groups) {
      if (new Set(g.candidates.map((c: any) => c.author)).size !== 10)
        throw Error("Duplicate author");
      for (const c of g.candidates) {
        const s = m.sources[c.source],
          v = c.versions[0];
        const r = await fetch(v.url);
        if (!r.ok) throw Error(v.url);
        const b = await r.arrayBuffer(),
          hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join("");
        if (hash !== s.sourceSha256 || hash !== v.sha256)
          throw Error("Original bytes changed " + c.id);
        if (g.id === "discovery") {
          const a = await ctx.decodeAudioData(b);
          if (Math.abs(a.duration - v.duration) > 0.003)
            throw Error("Decode " + c.id);
        } else {
          const a = new Audio(v.url);
          a.preload = "metadata";
          await new Promise<void>((ok, bad) => {
            a.onloadedmetadata = () => ok();
            a.onerror = () => bad(Error(c.id));
            a.load();
          });
          if (!isFinite(a.duration) || Math.abs(a.duration - v.duration) > 0.3)
            throw Error("Music cut " + c.id);
          a.removeAttribute("src");
          a.load();
        }
      }
    }
    await ctx.close();
    return Object.keys(m.sources).length;
  });
  expect(checked).toBe(20);
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(
    /ND1[\s\S]*ND4[\s\S]*NB1[\s\S]*NB5/,
  );
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.screenshot({
    path: "test-results/chrome-discovery-music-desktop.png",
  });
});
test("发现音乐手机试听与复制弹窗布局", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/discovery-music/index.html");
  await page.getByRole("button", { name: "选择 ND2", exact: true }).click();
  await page.locator("#export").click();
  await expect(page.locator("#copy-text")).toHaveValue(/ND2/);
  await expect(page.locator("#copy-dialog")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-discovery-music-mobile.png",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
});
