import { test, expect } from "@playwright/test";

test("动作进食试听：60 候选解码、默认满音量、动作时长、互斥播放与选择导出", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    (window as any).__actionSources = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: any[]) {
      (window as any).__actionSources.push(this);
      return start.apply(this, args as [number]);
    };
  });
  await page.goto("/audio-review/actions/index.html");
  await expect(page.locator(".candidate")).toHaveCount(5);
  await expect(page.locator("#categories button")).toHaveCount(12);
  await expect(page.locator("#volume")).toHaveValue("100");
  expect(
    await page
      .locator("audio")
      .evaluateAll((as) =>
        as.every((a) => (a as HTMLAudioElement).volume === 1),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "试听 R1", exact: true }).click();
  await expect(page.locator("#status")).toContainText("正在试听 R1");
  await page.locator("#reload-time").selectOption("1.5");
  await page.getByRole("button", { name: "试听 R1", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__actionSources.length))
    .toBe(2);
  const duration = await page.evaluate(() => {
    const s = (window as any).__actionSources.at(-1);
    return s.buffer.duration / s.playbackRate.value;
  });
  expect(duration).toBeCloseTo(1.5, 5);
  await page.getByRole("button", { name: "停止全部", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("已停止全部。");
  await page.getByRole("button", { name: "选择 R1", exact: true }).click();
  await expect(page.locator("#selection-text")).toContainText("R1");

  await page.locator('[data-category="noodle"]').click();
  await expect(page.locator("#food-items")).toContainText("2.4 秒");
  await page.getByRole("button", { name: "试听 N1", exact: true }).click();
  await expect(page.locator("#status")).toContainText("正在试听 N1");
  await page.locator("#effects").uncheck();
  await expect(page.locator(".timeline").first()).not.toContainText("恢复");
  await page.getByRole("button", { name: "试听 N1", exact: true }).click();
  await expect(page.locator("#status")).toContainText("仅进食动作");
  await page.getByRole("button", { name: "选择 N1", exact: true }).click();
  await expect(page.locator("#selection-text")).toContainText("不加恢复点缀");
  await page.locator('[data-category="drink"]').click();
  await page.getByRole("button", { name: "选择 D1", exact: true }).click();
  await page.locator("#version").selectOption("1");
  await expect(page.locator(".duration").first()).toContainText("六个核爪");
  await expect(page.locator(".duration").first()).toContainText("1.40s");
  await page.getByRole("button", { name: "选择 D2", exact: true }).click();
  await expect(page.locator("#selection-text")).toContainText("D1");
  await expect(page.locator("#selection-text")).toContainText("D2");
  await expect(page.locator("#selection-count")).toHaveText("4");
  await page
    .getByRole("button", { name: "连听本类 5 个", exact: true })
    .click();
  await expect(page.locator("#sequence")).toBeDisabled();
  await expect(page.locator("#status")).toContainText("正在试听 D1");
  await page.locator('[data-category="gear"]').click();
  await expect(page.locator("#sequence")).toBeEnabled();
  await page.locator(".candidate details summary").first().click();
  const original = page.locator(".candidate audio").first();
  await original.click({ position: { x: 20, y: 20 } });
  await expect(original).toHaveJSProperty("paused", false);
  await page.getByRole("button", { name: "试听 A2", exact: true }).click();
  await expect(original).toHaveJSProperty("paused", true);
  await page.getByRole("button", { name: "停止全部", exact: true }).click();

  const decoded = await page.evaluate(async () => {
    const data = await (await fetch("manifest-v1.json")).json();
    if (!data.previewOnly || data.installedToGame)
      throw Error("Preview isolation lost");
    const ctx = new AudioContext(),
      entries: any[] = [];
    for (const group of data.groups)
      for (const c of group.candidates) {
        for (const v of c.versions) {
          entries.push(v);
          if (v.physical) entries.push(v.physical);
        }
      }
    entries.push(...Object.values(data.sources));
    const unique = [...new Map(entries.map((x) => [x.url, x])).values()];
    for (const t of unique) {
      const response = await fetch(t.url);
      if (!response.ok) throw Error(t.url);
      const b = await ctx.decodeAudioData(await response.arrayBuffer());
      if (Math.abs(b.duration - t.duration) > 0.001 || b.numberOfChannels !== 2)
        throw Error("Decode mismatch: " + t.url);
    }
    await ctx.close();
    return unique.length;
  });
  expect(decoded).toBeGreaterThan(140);
  await page.getByRole("button", { name: "复制我的选择", exact: true }).click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(/R1[\s\S]*N1/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/chrome-action-audio-desktop.png",
    fullPage: true,
  });
});

test("动作进食试听手机：分类、原声与选择弹窗清晰无横向溢出", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/actions/index.html");
  await expect(page.locator(".candidate")).toHaveCount(5);
  await page.locator('[data-category="feast"]').click();
  await expect(page.locator("#food-items")).toContainText("豪华海鲜拼盘");
  await page.getByRole("button", { name: "选择 H2", exact: true }).click();
  await expect(page.locator("#selection-count")).toHaveText("1");
  await page.locator('[data-category="noodle"]').click();
  await page.getByRole("button", { name: "选择 N1", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-action-audio-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "复制我的选择", exact: true }).click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(/N1[\s\S]*H2/);
  await page.screenshot({
    path: "test-results/chrome-action-audio-choice.png",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
});
