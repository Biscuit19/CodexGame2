import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
test("统一调整台显示真实当前数据，编辑武器/物品/容器并导出时间戳JSON", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/game-workbench/index.html");
  await expect(page.locator("[data-item-card]")).toHaveCount(21);
  const before = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(
        ([k]) =>
          !k.startsWith("tricat-game-workbench-") &&
          !k.startsWith("tricat-audio-mixer-"),
      ),
    ),
  );
  await page.locator("[data-item-card=w3] summary").click();
  await expect(
    page.getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true }),
  ).toHaveValue("28");
  await page
    .getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true })
    .fill("33");
  await page
    .getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true })
    .blur();
  await page.locator("[data-tab=shop]").click();
  await page.locator("#search").fill("三尾47");
  await page.locator("[data-item-card=w3] summary").click();
  await page
    .getByRole("spinbutton", { name: "三尾47 / 商店售价", exact: true })
    .fill("3000");
  await page
    .getByRole("spinbutton", { name: "三尾47 / 商店售价", exact: true })
    .blur();
  await page.locator("[data-tab=containers]").click();
  await page
    .getByRole("spinbutton", { name: "纸箱物品数量", exact: true })
    .fill("4");
  await page
    .getByRole("spinbutton", { name: "纸箱物品数量", exact: true })
    .blur();
  const dataBefore = await page.evaluate(() => {
    const w = (window as any).__gameWorkbench;
    return {
      count: w.catalog.entries.length,
      weights: w.catalog.entries.filter((e: any) => e.probabilityGroup).length,
      tuning: w.tuning,
    };
  });
  expect(dataBefore.count).toBeGreaterThan(1500);
  expect(dataBefore.weights).toBe(65);
  await page.screenshot({ path: "test-results/workbench-containers.png" });
  await page.locator("[data-tab=audio]").click();
  const mixer = page.frameLocator("#mixer");
  await mixer
    .getByRole("button", { name: "播放背景音乐", exact: true })
    .click();
  await expect(
    mixer.getByRole("slider", { name: "UI点击 · SC1 轻轻啵一下", exact: true }),
  ).toHaveValue("1.42");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部配置", exact: true }).click();
  const d = await download;
  expect(d.suggestedFilename()).toMatch(
    /^tricat-game-and-audio_\d{8}T\d{6}_\d{3}\+0800\.json$/,
  );
  const raw = JSON.parse(await readFile((await d.path())!, "utf8"));
  await writeFile(
    test.info().outputPath("workbench-export.json"),
    JSON.stringify(raw, null, 2),
  );
  expect(raw.schema).toBe("tricat-game-workbench");
  expect(raw.source.fingerprint).toBeTruthy();
  expect(raw.tuning.items.w3).toMatchObject({ damage: 33, buyPrice: 3000 });
  expect(raw.tuning.containers.box).toBe(4);
  expect(raw.currentValues.items.find((i: any) => i.id === "w3").damage).toBe(
    33,
  );
  expect(raw.audio.buses.master).toBe(1.885);
  expect(raw.audio.enemyReloads).toBe(0);
  expect(raw.audio.preview.settings).toMatchObject({
    master: 1,
    music: 0.8,
    sfx: 1,
  });
  await page
    .getByRole("button", { name: "恢复当前发布值", exact: true })
    .click();
  await page.locator("#import-config").setInputFiles({
    name: "config.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(raw)),
  });
  await expect(page.locator("#status")).toContainText("已导入");
  await page.locator("[data-tab=weapons]").click();
  await page.locator("[data-item-card=w3] summary").click();
  await expect(
    page.getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true }),
  ).toHaveValue("33");
  await page.reload();
  await page.locator("[data-item-card=w3] summary").click();
  await expect(
    page.getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true }),
  ).toHaveValue("33");
  await page.locator("#import-config").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ ...raw, source: { fingerprint: "old" } }),
    ),
  });
  await expect(page.locator("#status")).toContainText("其他发布版本");
  const after = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(
        ([k]) =>
          !k.startsWith("tricat-game-workbench-") &&
          !k.startsWith("tricat-audio-mixer-"),
      ),
    ),
  );
  expect(after).toEqual(before);
  expect(errors).toEqual([]);
  await page
    .getByRole("spinbutton", { name: "三尾47 / 伤害", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/workbench-weapon.png" });
});
test("概率总和校验和归一化；移动规则来自真实源码；手机布局", async ({
  page,
}) => {
  await page.goto("/game-workbench/index.html");
  await page.locator("[data-tab=containers]").click();
  const card = page
    .locator(".probability-card")
    .filter({ hasText: "猎人小屋" })
    .first();
  const first = card.locator("input").first();
  await first.fill("50");
  await first.blur();
  await page.getByRole("button", { name: "仅导出数值", exact: true }).click();
  await expect(page.locator("#status")).toContainText("概率合计");
  await card
    .getByRole("button", { name: "按当前比例归一到100%", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "仅导出数值", exact: true }).click();
  await download;
  await page.locator('[data-tab="基础规则"]').click();
  await page.locator("#search").fill("持枪移动速度");
  await expect(page.locator(".rule-row input")).toHaveValue("220");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/workbench-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("上传的音量完整接入游戏且SC1实际解码播放，旧存档设置只迁移一次", async ({
  page,
}) => {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
  const data = await page.evaluate(async () => {
    const g = (window as any).__game,
      s = g.sound;
    await s.prepare();
    const { defaultBalance } = await import("/src/audio-balance.ts");
    const store = await import("/src/store.ts");
    const save = store.newSave();
    save.settings.master = 0.3;
    delete save.settings.audioPresetRevision;
    const migrated = store.validateSave(save);
    migrated.settings.master = 0.4;
    const again = store.validateSave(migrated);
    return {
      buffers: s.buffers.size,
      master: s.master.gain.value,
      music: s.musicBus.gain.value,
      effects: s.effects.gain.value,
      click: s.buffers.get("click").duration,
      baseline: defaultBalance,
      migrated: migrated.settings.music,
      kept: again.settings.master,
    };
  });
  expect(data.buffers).toBe(51);
  expect(data.master).toBeCloseTo(1.885);
  expect(data.music).toBeCloseTo(0.8 * 0.25088);
  expect(data.effects).toBeCloseTo(0.915);
  expect(data.click).toBeGreaterThan(0);
  expect(data.migrated).toBe(0.8);
  expect(data.kept).toBe(0.4);
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  expect(data.baseline.samples.click).toBe(1.42);
});
