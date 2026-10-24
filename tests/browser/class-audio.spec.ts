import { test, expect } from "@playwright/test";
async function start(page: any) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "临时测试入口", exact: true }).click();
}
test("已选进食原声按物品时长播放，攻击中断立即停止且四级统一三秒", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async () => {
    await (window as any).__game.sound.prepare();
  });
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  const result = await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      d = await import("/src/data.ts");
    r.enemies = [];
    r.paused = true;
    const plans: any[] = [];
    for (const id of [
      "f1",
      "f2",
      "c3_1",
      "c1_9",
      "c1_1",
      "f3",
      "c1_10",
      "c4_8",
      "f4",
      "c4_11",
    ]) {
      r.heal = 0;
      r.p.hp = 10;
      r.save.pack = [];
      r.save.equipment.food = d.makeItem(id, 2);
      r.useFood();
      const voice = g.sound.foodVoice;
      const key = [...g.sound.buffers].find(
        ([, b]: any) => b === voice?.buffer,
      )?.[0];
      const plan = {
        id,
        key,
        seconds: voice.buffer.duration / voice.playbackRate.value,
        expected: d.db[id].useTime,
        untouched: false,
        cancelled: false,
        qty: 0,
      };
      r.interrupt(false);
      plan.untouched = g.sound.foodVoice === voice && r.heal > 0;
      r.interrupt(true);
      plan.cancelled = !g.sound.foodVoice && r.heal === 0;
      plan.qty = r.save.equipment.food.qty;
      plans.push(plan);
    }
    r.heal = 0;
    r.p.hp = 10;
    r.save.equipment.food = d.makeItem("f4");
    r.useFood();
    return { plans, tier4Voice: !!g.sound.foodVoice };
  });
  expect(result.plans.map((p: any) => p.key)).toEqual([
    "food-fish",
    "food-paste",
    "food-ice",
    "food-water",
    "food-milk",
    "food-can",
    "food-fries",
    "food-fries",
    "food-tier4",
    "food-tier4",
  ]);
  for (const p of result.plans) {
    expect(p.seconds).toBeCloseTo(p.expected, 4);
    expect(p.untouched && p.cancelled).toBe(true);
    expect(p.qty).toBe(2);
  }
  expect(result.tier4Voice).toBe(true);
});
test("散布显示完整角度，近战详情显示真实伤害与攻速", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  for (const [id, expected] of [
    ["w0", "13.8"],
    ["w9", "0"],
    ["w16", "20.9"],
  ]) {
    await page.locator(`.shop-grid [data-item=${id}]`).click();
    await expect(page.locator("#item-menu")).toContainText(`散布 ${expected}°`);
    await expect(page.locator("#item-menu")).not.toContainText("散射");
    await page.locator(".shop-heading").click();
  }
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page.locator(".equipped-slot[data-slot=melee] .equipped-item").click();
  await expect(page.locator("#item-menu")).toContainText("伤害 48");
  await expect(page.locator("#item-menu")).toContainText("攻速 2.22 次／秒");
  await page.screenshot({
    path: "test-results/chrome-melee-damage-attack-speed.png",
  });
});
test("Chrome实际解码52个本地音效、真实四类射击及换弹倍速、敌人减音和切枪取消", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      if (/音效资源|decode/i.test(m.text())) errors.push(m.text());
  });
  await start(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .locator("#base-menu")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "音效来源与许可", exact: true }),
  ).toHaveAttribute("href", "./audio-credits.html");
  await page.screenshot({
    path: "test-results/chrome-audio-credits-settings.png",
  });
  const credits = await page.request.get("/audio-credits.html");
  expect(credits.ok()).toBe(true);
  expect(await credits.text()).toContain("Mike Koenig");
  await page
    .locator("#base-menu")
    .getByRole("button", { name: "返回基地菜单", exact: true })
    .click();
  await page
    .locator("#base-menu")
    .getByRole("button", { name: "继续整备", exact: true })
    .click();
  await page.evaluate(async () => {
    const g = (window as any).__game;
    await g.sound.prepare();
  });
  expect(
    await page.evaluate(() => (window as any).__game.sound.buffers.size),
  ).toBe(52);
  const silence = await page.evaluate(() => {
    const g = (window as any).__game;
    return [...g.sound.buffers].map(([key, b]: any) => ({
      key,
      length: b.length,
      rate: b.sampleRate,
      duration: b.duration,
      peak: Math.max(
        ...b
          .getChannelData(0)
          .slice(0, Math.min(32000, b.length))
          .map(Math.abs),
      ),
    }));
  });
  expect(silence.every((x: any) => x.length > 1000 && x.peak > 0.01)).toBe(
    true,
  );
  expect(
    silence.find((x: any) => x.key === "reload-sniper").duration,
  ).toBeCloseTo(2.561361, 3);
  expect(silence.find((x: any) => x.key === "shot-rifle").duration).toBeCloseTo(
    0.158458,
    3,
  );
  expect(
    silence.find((x: any) => x.key === "shot-shotgun").duration,
  ).toBeCloseTo(2, 3);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await expect(page.locator(".raid-hud")).toBeVisible();
  await page.evaluate(() => {
    const g = (window as any).__game,
      r = g.raid,
      ctx = g.sound.ctx;
    g.audioLog = [];
    r.enemies = [];
    r.walls = [];
    const original = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => {
      const source = original(),
        connect = source.connect.bind(source),
        start = source.start.bind(source),
        stop = source.stop.bind(source);
      let gain: any;
      source.connect = (target: any) => {
        gain = target;
        return connect(target);
      };
      source.start = (...a: any[]) => {
        const key = [...g.sound.buffers].find(
          ([k, b]: any) => b === source.buffer,
        )?.[0];
        if (key)
          g.audioLog.push({
            key,
            gain: gain.gain.value,
            rate: source.playbackRate.value,
            duration: source.buffer.duration,
            source,
            stopped: false,
          });
        return start(...a);
      };
      source.stop = (...a: any[]) => {
        const record = g.audioLog.find((x: any) => x.source === source);
        if (record) record.stopped = true;
        return stop(...a);
      };
      return source;
    };
  });
  const out = await page.evaluate(async () => {
    const g = (window as any).__game,
      r = g.raid,
      d = await import("/src/data.ts");
    for (const id of ["w0", "w3", "w9", "w16"]) {
      const w = d.makeItem(id);
      r.save.equipment.primary = w;
      r.activeWeapon = "primary";
      r.magazines[w.uid] = 2;
      r.fireCool = 0;
      r.reload = 0;
      r.shoot();
      g.sound.play("shot", 1, {
        weaponClass: d.db[id].weaponClass,
        enemy: true,
      });
    }
    const reloadPlans = [];
    for (const id of ["w0", "w3", "w9", "w16", "w15"]) {
      const w = d.makeItem(id);
      r.save.equipment.primary = w;
      r.activeWeapon = "primary";
      r.magazines[w.uid] = 1;
      r.fireCool = 0;
      r.reload = 0;
      r.loadMagazine();
      const voice = g.audioLog.at(-1);
      reloadPlans.push({
        key: voice.key,
        expected: r.weapon.reload,
        duration: voice.duration,
        rate: voice.rate,
      });
      g.sound.play("reload", 1, {
        weaponClass: d.db[id].weaponClass,
        seconds: r.weapon.reload,
        enemy: true,
      });
      const enemyVoice = g.audioLog.at(-1);
      reloadPlans.at(-1).enemyGain = enemyVoice.gain;
      r.selectWeapon("melee");
      reloadPlans.at(-1).cancelled = voice.stopped;
    }
    const expected = reloadPlans[0].expected;
    const reload = g.audioLog.find((x: any) => x.key === "reload-smg");
    return {
      logs: g.audioLog.map(({ source, ...rest }: any) => rest),
      expected,
      reloadStopped: reload.stopped,
      reloadPlans,
    };
  });
  for (const type of ["smg", "rifle", "sniper", "shotgun"]) {
    const records = out.logs.filter((x: any) => x.key === `shot-${type}`);
    expect(records).toHaveLength(2);
    expect(records[0].gain).toBeCloseTo(0.7, 5);
    expect(records[1].gain).toBeCloseTo(0.35, 5);
  }
  const reload = out.logs.find((x: any) => x.key === "reload-smg");
  expect(reload.duration / reload.rate).toBeCloseTo(out.expected, 4);
  expect(reload.rate).toBeGreaterThan(1);
  expect(out.reloadStopped).toBe(true);
  for (const plan of out.reloadPlans) {
    expect(plan.duration / plan.rate).toBeCloseTo(plan.expected, 4);
    expect(plan.enemyGain).toBe(0.75);
    expect(plan.cancelled).toBe(true);
  }
  expect(out.reloadPlans.some((p: any) => p.rate < 1)).toBe(true);
  expect(out.reloadPlans.some((p: any) => p.rate > 1)).toBe(true);
  await page.evaluate(() => {
    const s = (window as any).__game.sound;
    s.play("equip-gear");
    s.play("roll");
    s.play("melee");
    for (let i = 0; i < 60; i++)
      s.play("shot", 1, { weaponClass: "smg", enemy: true });
    (window as any).__game.maxVoices = s.voices.size;
    s.mode = "base";
  });
  expect(
    await page.evaluate(() => (window as any).__game.maxVoices),
  ).toBeLessThanOrEqual(40);
  expect(errors).toEqual([]);
});
