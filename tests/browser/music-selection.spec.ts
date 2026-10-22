import { test, expect } from "@playwright/test";
test("音乐设置默认蓝莓循环、四首完整曲目、随机切换、静音与旧存档兼容", async ({
  page,
}) => {
  await page.goto("/?test=1");
  const initial = await page.evaluate(() => JSON.stringify(localStorage));
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).__game.sound.musicElement?.readyState,
      ),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("BG5");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(page.getByLabel("背景曲目")).toHaveValue("BG5");
  await expect(page.getByLabel("音乐播放", { exact: true })).toHaveValue(
    "loop",
  );
  for (const [key, seconds] of [
    ["BG3", 78.98],
    ["BG5", 370.02],
    ["BG6", 95.97],
    ["BG10", 140.13],
  ] as const) {
    await page.getByLabel("背景曲目").selectOption(key);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as any).__game.sound.musicElement.readyState,
        ),
      )
      .toBeGreaterThanOrEqual(2);
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__game.sound.musicElement.duration),
      )
      .toBeCloseTo(seconds, 0);
    expect(
      await page.evaluate(() => {
        const s = (window as any).__game.sound;
        return {
          key: s.currentMusic,
          loop: s.musicElement.loop,
          paused: s.musicElement.paused,
          rate: s.musicElement.playbackRate,
        };
      }),
    ).toEqual({ key, loop: true, paused: false, rate: 1 });
  }
  await page.getByLabel("音乐播放", { exact: true }).selectOption("random");
  const random = await page.evaluate(() => {
    const s = (window as any).__game.sound,
      keys = [];
    for (let i = 0; i < 12; i++) {
      const before = s.currentMusic;
      s.musicElement.dispatchEvent(new Event("ended"));
      keys.push({ before, after: s.currentMusic });
    }
    return keys;
  });
  expect(
    random.every(
      (x) =>
        x.before !== x.after && ["BG3", "BG5", "BG6", "BG10"].includes(x.after),
    ),
  ).toBeTruthy();
  await page.getByLabel("音乐播放", { exact: true }).selectOption("loop");
  await page.getByLabel("背景曲目").selectOption("BG5");
  await page.getByLabel("背景音乐", { exact: true }).fill("0");
  expect(
    await page.evaluate(() => (window as any).__game.sound.musicElement.paused),
  ).toBe(true);
  await page.getByLabel("背景音乐", { exact: true }).fill("0.25");
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__game.sound.musicElement.paused),
    )
    .toBe(false);
  const data = await page.evaluate(async () => {
    const s = (window as any).__game.sound,
      g = (window as any).__game;
    const store = await import("/src/store.ts");
    const old = store.newSave();
    delete old.settings.musicTrack;
    delete old.settings.musicMode;
    store.validateSave(old);
    const invalid = structuredClone(old);
    (invalid.settings as any).musicTrack = "bad";
    let rejected = false;
    try {
      store.validateSave(invalid);
    } catch {
      rejected = true;
    }
    return {
      master: s.master.gain.value,
      expected: g.save.settings.master * 1.3,
      rejected,
    };
  });
  expect(data.master).toBeCloseTo(data.expected, 5);
  expect(data.rejected).toBe(true);
  await page.screenshot({ path: "test-results/chrome-music-settings.png" });
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(initial);
});
test("所选步枪/四级发现实际文件与减枪声增益正确", async ({ page }) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  const data = await page.evaluate(async () => {
    const s = (window as any).__game.sound;
    await s.prepare();
    const samples = await import("/src/audio-samples.ts");
    const metadata = await (
      await fetch("/src/assets/audio/approved-music.json")
    ).json();
    const result: any = {};
    for (const key of ["shot-rifle", "discover-4"]) {
      const r = await fetch(
        samples.sampleBank[key as keyof typeof samples.sampleBank],
      );
      const bytes = await r.arrayBuffer();
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      ]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      result[key] = {
        hash,
        expected: metadata.tracks[key].sha256,
        duration: s.buffers.get(key).duration,
        expectedDuration: metadata.tracks[key].duration,
      };
    }
    result.gains = ["smg", "rifle", "sniper", "shotgun"].map((weaponClass) => ({
      p: samples.sampleChoice("shot", { weaponClass: weaponClass as any })!
        .gain,
      e: samples.sampleChoice("enemy", { weaponClass: weaponClass as any })!
        .gain,
    }));
    result.reveal = samples.sampleChoice("loot", { tier: 4 })?.gain;
    return result;
  });
  for (const key of ["shot-rifle", "discover-4"]) {
    expect(data[key].hash).toBe(data[key].expected);
    expect(data[key].duration).toBeCloseTo(data[key].expectedDuration, 3);
  }
  for (const p of data.gains) {
    expect(p.p).toBe(0.7);
    expect(p.e / p.p).toBe(0.5);
  }
  expect(data.reveal).toBe(1.2);
});
