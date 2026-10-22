import { test, expect } from "@playwright/test";
test("新枪声与完整音乐：20不同作者、30候选、连发时序、完整原曲和复制", async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__voices = [];
    const orig = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      const row = {
        at: args[0] || 0,
        rate: this.playbackRate.value,
        ended: false,
      };
      (window as any).__voices.push(row);
      this.addEventListener("ended", () => (row.ended = true));
      return orig.apply(this, args as [number]);
    };
  });
  await page.goto("/audio-review/shots-music/index.html");
  await expect(page.locator("#categories button")).toHaveCount(3);
  await expect(page.locator(".candidate")).toHaveCount(10);
  await expect(page.locator("#volume")).toHaveValue("100");
  await page.getByRole("button", { name: "选择 SM1", exact: true }).click();
  await page.locator("#rps").fill("8");
  await page.locator("#rps").dispatchEvent("input");
  await page.locator("#burst-seconds").selectOption("1");
  await page.getByRole("button", { name: "连发试听 SM1", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__voices.length))
    .toBe(8);
  const voices = await page.evaluate(() => (window as any).__voices);
  for (let n = 1; n < 8; n++)
    expect(voices[n].at - voices[n - 1].at).toBeCloseTo(0.125, 5);
  expect(voices.every((x: any) => x.rate === 1)).toBe(true);
  await page.locator("#stop").click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__voices.every((x: any) => x.ended)),
    )
    .toBe(true);
  await page.locator('[data-category="rifle"]').click();
  await page.getByRole("button", { name: "选择 AR2", exact: true }).click();
  await page.locator('[data-category="music"]').click();
  await expect(page.locator("#gun-controls")).toBeHidden();
  await page
    .getByRole("button", { name: "播放完整曲 BG1", exact: true })
    .click();
  const player = page.locator('audio[data-candidate="BG1"]');
  await expect(player).toHaveJSProperty("paused", false);
  expect(
    await player.evaluate((a: HTMLAudioElement) => a.duration),
  ).toBeGreaterThan(90);
  await player.evaluate((a: HTMLAudioElement) => {
    a.currentTime = 45;
  });
  await expect
    .poll(() => player.evaluate((a: HTMLAudioElement) => a.currentTime))
    .toBeGreaterThan(44);
  await page.locator("#stop").click();
  await expect(player).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "选择 BG1", exact: true }).click();
  await page.getByRole("button", { name: "选择 BG2", exact: true }).click();
  await expect(page.locator("#selection-count")).toHaveText("4");
  const checked = await page.evaluate(async () => {
    const m = await (await fetch("manifest-v1.json")).json();
    if (!m.previewOnly || m.installedToGame) throw Error("Isolation");
    const shots = m.groups.slice(0, 2).flatMap((g: any) => g.candidates);
    if (
      new Set(shots.map((c: any) => c.author)).size !== 20 ||
      new Set(shots.map((c: any) => c.sourceUrl)).size !== 20
    )
      throw Error("Duplicate shot source/author");
    const music = m.groups[2].candidates;
    if (new Set(music.map((c: any) => c.author)).size !== 10)
      throw Error("Duplicate music author");
    const entries = [
      ...Object.values(m.sources),
      ...m.groups.flatMap((g: any) =>
        g.candidates.flatMap((c: any) => c.versions),
      ),
    ] as any[];
    const unique = [...new Map(entries.map((e) => [e.url, e])).values()];
    const ctx = new AudioContext();
    for (const e of unique) {
      const r = await fetch(e.url);
      if (!r.ok) throw Error(e.url);
      const b = await r.arrayBuffer();
      const h = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", b)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      if (h !== e.sha256) throw Error("Hash " + e.url);
      if (!e.whole) {
        const audio = await ctx.decodeAudioData(b);
        if (Math.abs(audio.duration - e.duration) > 0.001)
          throw Error("Decode " + e.url);
      }
    }
    for (const c of music) {
      const s = m.sources[c.source],
        v = c.versions[0];
      if (
        v.sha256 !== s.sourceSha256 ||
        Math.abs(v.duration - s.sourceDuration) > 0.001
      )
        throw Error("Music cut/reencoded");
      const a = new Audio(v.url);
      a.preload = "metadata";
      await new Promise<void>((resolve, reject) => {
        a.onloadedmetadata = () => resolve();
        a.onerror = () => reject(Error(v.url));
        a.load();
      });
      if (
        !Number.isFinite(a.duration) ||
        Math.abs(a.duration - v.duration) > 0.3
      )
        throw Error("Music duration " + c.id);
      a.removeAttribute("src");
      a.load();
    }
    await ctx.close();
    return unique.length;
  });
  expect(checked).toBe(50);
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(
    /SM1[\s\S]*AR2[\s\S]*BG1[\s\S]*BG2/,
  );
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/chrome-shots-music-desktop.png",
    fullPage: false,
  });
});
test("新枪声音乐手机：整曲播放器与多选弹窗可见，无水平溢出", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/shots-music/index.html");
  await expect(page.locator(".candidate")).toHaveCount(10);
  await page.locator('[data-category="music"]').click();
  await page.getByRole("button", { name: "选择 BG3", exact: true }).click();
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(/BG3/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/chrome-shots-music-mobile.png" });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
});
