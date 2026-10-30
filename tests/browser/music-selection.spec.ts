import { test, expect } from "@playwright/test";
test("基地原始配乐循环、11首游戏音乐可选、随机与撤离后恢复基地", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/?test=1");
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__game.sound.musicElement.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("ORIGINAL");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(page.getByLabel("游戏音乐", { exact: true })).toHaveValue("BG5");
  await expect(
    page.getByLabel("游戏音乐", { exact: true }).locator("option"),
  ).toHaveCount(11);
  await expect(
    page.getByLabel("游戏音乐播放", { exact: true }).locator("option"),
  ).toHaveText(["单曲循环", "随机播放"]);
  await expect(
    page.getByText("循环模式播放所选曲目；随机模式在四首音乐间切换。"),
  ).toHaveCount(0);
  await page.getByLabel("游戏音乐", { exact: true }).selectOption("NB2");
  await page.getByLabel("游戏音乐播放", { exact: true }).selectOption("random");
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("ORIGINAL");
  expect(
    await page.evaluate(() => (window as any).__game.sound.musicElement.loop),
  ).toBe(true);
  await page.screenshot({ path: "test-results/chrome-music-ten-settings.png" });
  await page.getByRole("button", { name: "返回基地菜单", exact: true }).click();
  await page.getByRole("button", { name: "继续整备", exact: true }).click();
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("NB2");
  expect(
    await page.evaluate(() => (window as any).__game.sound.musicElement.loop),
  ).toBe(false);
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.paused = true;
  });
  const details = await page.evaluate(async () => {
    const g = (window as any).__game,
      s = g.sound,
      mod = await import("/src/music.ts"),
      meta = await (
        await fetch("/src/assets/audio/approved-raid-audio.json")
      ).json(),
      tracks = [];
    const approved = await (
      await fetch("/src/assets/audio/approved-peaceful-music.json")
    ).json();
    for (const t of approved.tracks)
      meta.tracks[t.id] = { duration: t.duration, inputLufs: t.inputLufs };
    s.musicPreview = true; // The mixer may audition both context banks.
    for (const [id, t] of Object.entries(mod.musicTracks) as any) {
      s.settings.musicTrack = id;
      s.settings.musicMode = "loop";
      s.apply();
      const a = s.musicElement;
      await new Promise<void>((ok, bad) => {
        if (a.readyState >= 2 && isFinite(a.duration)) ok();
        else {
          a.addEventListener("loadedmetadata", () => ok(), { once: true });
          a.addEventListener("error", () => bad(Error(id)), { once: true });
        }
      });
      tracks.push({
        id,
        duration: a.duration,
        expected: meta.tracks[id].duration,
        loudness: meta.tracks[id].inputLufs + 20 * Math.log10(t.gain),
        target: meta.musicTargetLufs,
      });
    }
    s.musicPreview = false;
    s.settings.musicTrack = "NB2";
    s.settings.musicMode = "random";
    s.apply();
    const random = [];
    for (let i = 0; i < 15; i++) {
      const before = s.currentMusic;
      s.musicElement.dispatchEvent(new Event("ended"));
      random.push({ before, after: s.currentMusic });
    }
    s.settings.musicMode = "loop";
    s.apply();
    s.settings.music = 0;
    s.apply();
    const muted = s.musicElement.paused;
    s.settings.music = 0.25;
    s.apply();
    const store = await import("/src/store.ts"),
      old = store.newSave();
    delete old.settings.musicTrack;
    delete old.settings.musicMode;
    store.validateSave(old);
    const valid = structuredClone(old);
    valid.settings.musicTrack = "ORIGINAL";
    store.validateSave(valid);
    return {
      tracks,
      random,
      muted,
      master: s.master.gain.value,
      expected: g.save.settings.master * 1.885,
      musicGain: s.musicBus.gain.value,
    };
  });
  expect(details.tracks).toHaveLength(17);
  for (const t of details.tracks) {
    expect(t.duration).toBeCloseTo(t.expected, 0);
    expect(t.loudness).toBeCloseTo(t.target, 3);
  }
  expect(
    details.random.every(
      (r) =>
        r.before !== r.after && details.tracks.some((t) => t.id === r.after),
    ),
  ).toBe(true);
  expect(details.muted).toBe(true);
  expect(details.master).toBeCloseTo(details.expected, 5);
  expect(details.musicGain).toBeCloseTo(0.25 * 0.25088, 5);
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid;
    r.paused = false;
    r.enemies = [];
    r.search = undefined;
    r.inventory = false;
    const e = r.exits.find((e: any) => !e.paid);
    e.active = true;
    r.p.x = e.x;
    r.p.y = e.y;
  });
  await expect(page.getByRole("button", { name: /返回基地/ })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: /返回基地/ }).click();
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__game.sound.currentMusic),
  ).toBe("ORIGINAL");
  expect(
    await page.evaluate(() => (window as any).__game.sound.musicElement.loop),
  ).toBe(true);
  expect(
    await page.evaluate(() => (window as any).__game.save.settings.musicTrack),
  ).toBe("NB2");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(storage);
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
    const latest = await (
      await fetch("/src/assets/audio/approved-raid-audio.json")
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
        expected: (latest.tracks[key] ?? metadata.tracks[key]).sha256,
        duration: s.buffers.get(key).duration,
        expectedDuration: (latest.tracks[key] ?? metadata.tracks[key]).duration,
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
  expect(data.reveal).toBe(1.38);
  await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.settings.musicTrack = "ORIGINAL";
    s.settings.musicMode = "loop";
    s.mode = "raid";
    s.apply();
  });
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__game.sound.musicElement.readyState),
    )
    .toBeGreaterThanOrEqual(2);
  const returned = await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.musicElement.currentTime = 12;
    s.mode = "base";
    return {
      key: s.currentMusic,
      time: s.musicElement.currentTime,
      loop: s.musicElement.loop,
    };
  });
  expect(returned).toEqual({ key: "ORIGINAL", time: 0, loop: true });
});
