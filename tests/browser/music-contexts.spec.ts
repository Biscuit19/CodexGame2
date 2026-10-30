import { test, expect } from "@playwright/test";
test("基地与游戏音乐曲目、音量独立，随机不含基地曲，撤离恢复基地", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(
    page.getByLabel("基地音乐", { exact: true }).locator("option"),
  ).toHaveCount(8);
  await expect(
    page.getByLabel("游戏音乐", { exact: true }).locator("option"),
  ).toHaveCount(11);
  await expect(
    page
      .getByLabel("游戏音乐", { exact: true })
      .locator("option[value=ORIGINAL]"),
  ).toHaveCount(0);
  await page.getByLabel("游戏音乐", { exact: true }).selectOption("NB2");
  await page
    .getByLabel("基地音乐音量", { exact: true })
    .evaluate((el: HTMLInputElement) => {
      el.value = "0.2";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await page
    .getByLabel("游戏音乐音量", { exact: true })
    .evaluate((el: HTMLInputElement) => {
      el.value = "0.6";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  const base = await page.evaluate(() => {
    const s = (window as any).__game.sound;
    return {
      key: s.currentMusic,
      gain: s.musicBus.gain.value,
      expected: s.balance.buses.music * 0.2,
    };
  });
  expect(base.key).toBe("ORIGINAL");
  expect(base.gain).toBeCloseTo(base.expected, 5);
  await page.screenshot({ path: "test-results/separate-music-settings.png" });
  await page.evaluate(() => (window as any).__game.deploy(true));
  const game = await page.evaluate(() => {
    const s = (window as any).__game.sound;
    return {
      key: s.currentMusic,
      gain: s.musicBus.gain.value,
      expected: s.balance.buses.music * 0.6,
    };
  });
  expect(game.key).toBe("NB2");
  expect(game.gain).toBeCloseTo(game.expected, 5);
  const random = await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.settings.musicMode = "random";
    s.apply();
    const keys = [];
    for (let n = 0; n < 20; n++) {
      s.musicElement.dispatchEvent(new Event("ended"));
      keys.push(s.currentMusic);
    }
    return keys;
  });
  expect(random).not.toContain("ORIGINAL");
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.p.x = r.exits[0].x;
    r.p.y = r.exits[0].y;
    for (let n = 0; n < 240; n++)
      r.update(1 / 60, new Set(), {
        x: r.p.x + 100,
        y: r.p.y - 24,
        down: false,
      });
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.sound.currentMusic))
    .toBe("ORIGINAL");
  const returned = await page.evaluate(() => {
    const s = (window as any).__game.sound;
    return {
      gain: s.musicBus.gain.value,
      expected: s.balance.buses.music * 0.2,
      loop: s.musicElement.loop,
    };
  });
  expect(returned.gain).toBeCloseTo(returned.expected, 5);
  expect(returned.loop).toBe(true);
});
test("20首试听可播放、默认满音量、按基地游戏分别选择并复制导出", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/audio-review/peaceful-music/index.html");
  await expect(page.locator(".card")).toHaveCount(20);
  await expect(page.locator("#volume")).toHaveValue("100");
  expect(
    await page
      .locator("audio")
      .evaluateAll((els) => els.every((a: HTMLAudioElement) => a.volume === 1)),
  ).toBe(true);
  await page.getByRole("button", { name: "播放 PM01", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio[data-id=PM01]")
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "播放 PM02", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("audio[data-id=PM02]")
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThan(0.1);
  expect(
    await page
      .locator("audio[data-id=PM01]")
      .evaluate((a: HTMLAudioElement) => a.paused),
  ).toBe(true);
  await page.locator("[data-loop=PM02]").check();
  expect(
    await page
      .locator("audio[data-id=PM02]")
      .evaluate((a: HTMLAudioElement) => a.loop),
  ).toBe(true);
  await page.locator("[data-area=base][data-id=PM05]").click();
  await page.locator("[data-area=game][data-id=PM18]").click();
  await page.getByRole("button", { name: "复制我的选择" }).click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(
    /基地音乐：PM05[\s\S]*游戏音乐：PM18/,
  );
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出选择JSON" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(
    /^tricat-music-selection_\d{8}T\d{6}_\d{3}\+0800\.json$/,
  );
  await page.screenshot({
    path: "test-results/peaceful-music-review.png",
    fullPage: false,
  });
  await page.reload();
  await expect(page.locator("[data-area=base][data-id=PM05]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("调音台导出独立基地音量且兼容旧三滑块JSON", async ({ page }) => {
  await page.goto("/audio-mixer/index.html");
  await page.locator("details > summary").click();
  await expect(
    page.getByText("游戏设置 · 基地音乐", { exact: true }),
  ).toBeVisible();
  const result = await page.evaluate(() => {
    const m = (window as any).__audioMixer;
    m.sound.settings.baseMusic = 0.25;
    m.sound.settings.music = 0.7;
    const profile = m.profile();
    return {
      base: profile.preview.settings.baseMusic,
      game: profile.preview.settings.music,
    };
  });
  expect(result).toEqual({ base: 0.25, game: 0.7 });
  const old = await page.evaluate(() => {
    const p = (window as any).__audioMixer.profile();
    delete p.preview.settings.baseMusic;
    p.preview.settings.music = 0.33;
    return p;
  });
  await page.locator("#import").setInputFiles({
    name: "old-audio.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(old)),
  });
  await expect(page.locator("#status")).toContainText("已导入配置");
  expect(
    await page.evaluate(
      () => (window as any).__audioMixer.profile().preview.settings.baseMusic,
    ),
  ).toBe(0.33);
});
