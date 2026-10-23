import { test, expect } from "@playwright/test";
test("15个新的柔软候选与原声对照；最大试听音量、解码、勾选复制", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/audio-review/soft-clicks/index.html");
  await expect(page.locator("#groups .card")).toHaveCount(15);
  expect(
    await page
      .locator("audio")
      .evaluateAll((a: any[]) => a.every((n) => n.volume === 1)),
  ).toBe(true);
  const data = await page.evaluate(async () => {
    const m = await fetch("manifest-v1.json").then((r) => r.json()),
      c = new AudioContext();
    const all = [m.reference, ...m.groups.flatMap((g: any) => g.candidates)];
    return {
      authors: new Set(m.groups[0].candidates.map((v: any) => v.author)).size,
      decoded: await Promise.all(
        all.map(async (v: any) => {
          const r = await fetch(v.audio.url),
            b = await c.decodeAudioData(await r.arrayBuffer());
          return b.duration > 0 && b.duration < 2;
        }),
      ),
    };
  });
  expect(data.authors).toBe(10);
  expect(data.decoded).toEqual(Array(16).fill(true));
  await page.getByRole("checkbox", { name: "选择 SC1", exact: true }).check();
  await page.getByRole("checkbox", { name: "选择 OC3", exact: true }).check();
  await page.getByRole("button", { name: "复制选择" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "OC3",
  );
  await page
    .locator('[data-id="SC1"] audio')
    .first()
    .evaluate((a: any) => a.play());
  await expect
    .poll(() =>
      page
        .locator('[data-id="SC1"] audio')
        .first()
        .evaluate((a: any) => a.currentTime),
    )
    .toBeGreaterThan(0);
  await page.screenshot({
    path: "test-results/soft-clicks.png",
    fullPage: true,
  });
});
test("全音效调音台复用50个现用样本；BGM混听、音量往返导出及存档隔离", async ({
  page,
}) => {
  await page.goto("/audio-mixer/index.html");
  const before = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(
        ([k]) => k !== "tricat-audio-mixer-v1",
      ),
    ),
  );
  await expect(page.locator("#tracks .volume-row")).toHaveCount(10);
  await expect(page.locator("#effects [data-key]")).toHaveCount(50);
  await page.getByRole("button", { name: "播放背景音乐", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => !(window as any).__audioMixer.sound.musicElement.paused,
      ),
    )
    .toBe(true);
  await page.evaluate(async () => {
    const s = (window as any).__audioMixer.sound;
    await s.prepare();
  });
  expect(
    await page.evaluate(() => (window as any).__audioMixer.sound.buffers.size),
  ).toBe(50);
  await page
    .getByRole("slider", { name: "购买 · BU3 几枚硬币付款", exact: true })
    .fill("0.6");
  await page
    .getByRole("slider", { name: "UI点击 · 原始声音", exact: true })
    .fill("0");
  await page
    .getByRole("slider", { name: "BGM总音量", exact: true })
    .fill("0.8");
  await page
    .locator('[data-key="buy"]')
    .getByRole("button", { name: "试听", exact: true })
    .click();
  const values = await page.evaluate(() => {
    const m = (window as any).__audioMixer;
    return {
      profile: m.profile(),
      bus: m.sound.musicBus.gain.value,
      playing: !m.sound.musicElement.paused,
    };
  });
  expect(values.playing).toBe(true);
  expect(values.profile.samples.buy).toBe(0.6);
  expect(values.profile.cues.click).toBe(0);
  expect(values.bus).toBeCloseTo(0.25 * 0.35 * 0.64 * 0.8);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出配置文件" }).click();
  const d = await download;
  const path = await d.path();
  const fs = await import("node:fs/promises");
  const profile = JSON.parse(await fs.readFile(path!, "utf8"));
  expect(profile.samples.buy).toBe(0.6);
  await page.getByRole("button", { name: "恢复本轮默认" }).click();
  await page.locator("#import").setInputFiles({
    name: "balance.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile)),
  });
  await expect(
    page.getByRole("slider", { name: "购买 · BU3 几枚硬币付款", exact: true }),
  ).toHaveValue(".6".replace(/^\./, "0."));
  await page.locator("#filter").fill("发现");
  await page.screenshot({
    path: "test-results/audio-mixer.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("slider", { name: "UI点击 · 原始声音", exact: true }),
  ).toHaveValue("0");
  const after = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(
        ([k]) => k !== "tricat-audio-mixer-v1",
      ),
    ),
  );
  expect(after).toEqual(before);
  await page.locator("#import").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...profile, revision: "old" })),
  });
  await expect(page.locator("#status")).toContainText("导入失败");
});

test("购买按钮/双击只在成功时响BU3；实际单件出售响SE1", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.events = [];
    const play = g.sound.play.bind(g.sound);
    g.sound.play = (name: string, ...args: any[]) => {
      g.events.push(name);
      play(name, ...args);
    };
  });
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await page.locator(".shop-grid [data-item=w0]").dblclick();
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.events.filter((n: string) => n === "buy").length,
    ),
  ).toBe(1);
  await page.locator(".shop-grid [data-item=w0]").click();
  await page.locator("[data-action=purchase-selected]").click();
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.events.filter((n: string) => n === "buy").length,
    ),
  ).toBe(2);
  await page.evaluate(() => {
    (window as any).__game.save.coins = 0;
  });
  await page.locator(".shop-grid [data-item=w0]").dblclick();
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.events.filter((n: string) => n === "buy").length,
    ),
  ).toBe(2);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator(".warehouse-grid [data-action=select]").first().click();
  await page.locator("[data-action=sell]").click();
  expect(
    await page.evaluate(
      () =>
        (window as any).__game.events.filter((n: string) => n === "sell")
          .length,
    ),
  ).toBe(1);
});

test("手机试听及调音页不横向溢出，支持输入精确百分比", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/soft-clicks/index.html");
  await expect(page.locator("#groups .card")).toHaveCount(15);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/soft-clicks-mobile.png" });
  await page.goto("/audio-mixer/index.html");
  await page
    .getByRole("spinbutton", { name: "总音量百分比", exact: true })
    .fill("75");
  await page
    .getByRole("spinbutton", { name: "总音量百分比", exact: true })
    .blur();
  await expect(
    page.getByRole("slider", { name: "总音量", exact: true }),
  ).toHaveValue("0.75");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/audio-mixer-mobile.png" });
});
