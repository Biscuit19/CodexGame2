import { test, expect, type Page } from "@playwright/test";
const ids = ["c0_0", "c0_1", "c0_6", "c2_4", "c4_0"];
const rgb = [
  "rgb(248, 250, 243)",
  "rgb(156, 242, 164)",
  "rgb(129, 206, 255)",
  "rgb(255, 224, 122)",
  "rgb(255, 125, 121)",
];
async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const data = Object.fromEntries(
      Object.keys(localStorage)
        .sort()
        .map((key) => [key, localStorage.getItem(key)]),
    );
    const saves = await new Promise<unknown[]>((resolve, reject) => {
      const request = indexedDB.open("tricat", 1);
      request.onsuccess = () => {
        const db = request.result,
          r = db.transaction("saves").objectStore("saves").getAll();
        r.onsuccess = () => {
          resolve(r.result);
          db.close();
        };
        r.onerror = () => reject(r.error);
      };
      request.onerror = () => reject(request.error);
    });
    return { data, saves };
  });
}

test("Chrome图鉴详情使用顶层弹窗，简洁问号、品质文字、关闭与Esc均可见可用", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(async (items) => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.collection = items;
    g.save.stash = items.map((id) => d.makeItem(id));
    g.render();
  }, ids);
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  for (let n = 0; n < ids.length; n++)
    expect(
      await page
        .locator(`[data-grid="stash"] [data-item="${ids[n]}"] strong`)
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe(rgb[n]);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  const unknown = page.locator('.collection-item[data-id="c5_14"]');
  await expect(unknown.locator("svg")).toHaveCount(1);
  await expect(unknown.locator(".art-glyph")).toHaveCount(0);
  await expect(unknown).toBeDisabled();
  await page.screenshot({
    path: "test-results/chrome-simple-question-and-colors.png",
    fullPage: true,
  });
  for (let n = 0; n < ids.length; n++) {
    const card = page.locator(`.collection-item[data-id="${ids[n]}"]`);
    expect(
      await card.locator("strong").evaluate((el) => getComputedStyle(el).color),
    ).toBe(rgb[n]);
    await card.click();
    const dialog = page.locator("#collection-dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
    await expect(dialog.locator(".collection-description")).toBeVisible();
    expect(
      await dialog.locator(".collection-modal").evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
    if (n === 4) {
      await page.evaluate(() => {
        const layer = document.createElement("div");
        layer.id = "test-high-layer";
        Object.assign(layer.style, {
          position: "fixed",
          inset: "0",
          zIndex: "2147483647",
          background: "#0c1f18",
          pointerEvents: "none",
        });
        document.body.append(layer);
      });
      await page.screenshot({
        path: "test-results/chrome-collection-native-above-canvas.png",
      });
      await page.evaluate(() =>
        document.getElementById("test-high-layer")?.remove(),
      );
    }
    if (n % 2) await page.keyboard.press("Escape");
    else
      await dialog.getByRole("button", { name: "关闭", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
});

test("隐藏测试入口资金与地图图鉴全解锁，购买、退出、结算和刷新不占用或覆盖存档", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      store = await import("/src/store.ts");
    g.save.coins = 12345;
    store.persist(g.save);
  });
  await page.getByRole("button", { name: "开始界面", exact: true }).click();
  const before = await stored(page);
  const entry = page.getByRole("button", { name: "临时测试入口", exact: true });
  const rect = await entry.boundingBox();
  expect(rect!.x).toBeGreaterThan(1350);
  expect(rect!.y).toBeGreaterThan(940);
  await entry.click();
  await expect(page.locator(".header-state")).toContainText("999,999");
  await expect(page.locator(".header-state")).toContainText("临时测试");
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  await expect(page.locator(".collection-item.found")).toHaveCount(70);
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await expect(page.locator(".map-card")).toHaveCount(4);
  await expect(page.locator(".map-cards")).not.toContainText("尚未解锁");
  for (let map = 0; map < 4; map++) {
    if (map > 0)
      await page.getByRole("button", { name: "战区地图", exact: true }).click();
    await page.locator(`[data-action="map-select"][data-id="${map}"]`).click();
    await page.getByRole("button", { name: "开始行动", exact: true }).click();
    await expect(page.locator("#raid-time")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "退出本局", exact: true }).click();
  }
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  await page.locator('[data-action="category"][data-id="food"]').click();
  await page.locator('.shop-grid [data-item="f1"]').click();
  await page
    .locator("#item-menu")
    .getByRole("button", { name: /购买/ })
    .click();
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page
    .locator("#base-menu")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await expect(page.getByText("存档管理", { exact: true })).toHaveCount(0);
  await page.getByRole("slider", { name: "主音量", exact: true }).fill("0.2");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() =>
    (window as any).__game.raid.finish(true, "测试撤离"),
  );
  await page.locator('[data-action="close-result"]').click();
  await page.getByRole("button", { name: "开始界面", exact: true }).click();
  expect(await stored(page)).toEqual(before);
  await page.reload();
  expect(await stored(page)).toEqual(before);
  await page.getByRole("button", { name: "读取存档", exact: true }).click();
  await page.getByRole("button", { name: "读取", exact: true }).first().click();
  await expect(page.locator(".header-state")).toContainText("12,345");
  expect(
    await page.evaluate(() => (window as any).__game.save.temporary),
  ).toBeUndefined();
});

test("补给按五份分堆、拖拽合并，食用只扣一份", async ({ page }) => {
  await start(page);
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.pack = [d.makeItem("f1", 4)];
    g.save.stash = [d.makeItem("f1", 3)];
    g.render();
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await page
    .locator('[data-grid="stash"] [data-item="f1"]')
    .dragTo(page.locator('[data-grid="pack"]'));
  expect(
    await page
      .locator('[data-grid="pack"] [data-item="f1"] .stack-quantity')
      .allTextContents(),
  ).toEqual(["5 份", "2 份"]);
  await page.locator('[data-grid="pack"] [data-item="f1"]').first().click();
  await expect(page.locator("#item-menu")).toContainText("390");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() => {
    const r = (window as any).__game.raid;
    r.enemies = [];
    r.p.hp = 20;
  });
  await page.keyboard.press("Tab");
  await page.locator('.pack-grid [data-item="f1"]').first().click();
  await page
    .locator("#item-menu")
    .getByRole("button", { name: "食用", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__game.save.pack[0].qty))
    .toBe(4);
  expect(
    await page.evaluate(() =>
      (window as any).__game.save.pack.reduce(
        (n: number, i: any) => n + i.qty,
        0,
      ),
    ),
  ).toBe(6);
  await page.screenshot({ path: "test-results/chrome-food-stacks.png" });
});

test("首次发现顶部居中，五档颜色与描述门槛正确，武器弹药大图随切换更新", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await page.getByRole("button", { name: "战区地图", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.raid.enemies = [];
    g.save.discovered = [];
    g.save.collection = [];
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (let n = 0; n < ids.length; n++) {
    await page.evaluate(async (id) => {
      const g = (window as any).__game,
        d = await import("/src/data.ts");
      g.raid.discover(d.makeItem(id));
    }, ids[n]);
    const banner = page.locator(".discovery-card");
    await expect(banner).toHaveAttribute("data-item", ids[n]);
    await expect(banner.locator(".discovery-description")).toHaveCount(
      n >= 2 ? 1 : 0,
    );
    expect(
      await banner
        .locator(".discovery-name span")
        .evaluate((el) => getComputedStyle(el).color),
    ).toBe(rgb[n]);
    const rect = await banner.boundingBox();
    expect(rect!.y).toBeLessThan(70);
    expect(Math.abs(rect!.x + rect!.width / 2 - 720)).toBeLessThan(3);
    await page.clock.runFor(400);
    if (n === 4) {
      await expect(banner).toContainText("哇！金色传说！");
      await page.screenshot({
        path: "test-results/chrome-legend-discovery-and-weapon-hud.png",
      });
    }
    await page.clock.fastForward([1000, 1000, 2000, 3000, 5000][n] - 450);
    await expect(banner).toBeVisible();
    await page.clock.runFor(100);
    await expect(banner).toHaveCount(0);
  }
  await page.clock.resume();
  await expect(page.locator('#weapon-art [data-art="w0"]')).toBeVisible();
  await expect(page.locator('#ammo-art [data-art="m1"]')).toBeVisible();
  const gun = await page.locator("#weapon-art .item-art").boundingBox(),
    ammo = await page.locator("#ammo-art .item-art").boundingBox();
  expect(gun!.width).toBeGreaterThan(ammo!.width * 3);
  expect(gun!.height).toBeGreaterThan(ammo!.height * 2);
  const hud = await page.locator(".weapon-hud").boundingBox();
  expect(hud!.height).toBeLessThan(190);
  expect(hud!.width / hud!.height).toBeGreaterThan(2);
  expect(
    await page
      .locator("#weapon-art")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    const item = d.makeItem("w16");
    item.loaded = { tier: 3, count: 4 };
    g.save.pack = [item];
    g.raid.equipLoot(item.uid, true);
  });
  await page.keyboard.press("Digit2");
  await expect(page.locator('#weapon-art [data-art="w16"]')).toBeVisible();
  await expect(page.locator('#ammo-art [data-art="m3"]')).toBeVisible();
  await expect(page.locator("#mag-count")).toHaveText("04");
  await page.keyboard.press("Digit3");
  await expect(page.locator('#weapon-art [data-art="k0"]')).toBeVisible();
  await expect(page.locator("#ammo-art")).toBeHidden();
  await expect(page.locator("#ammo-name")).toHaveText("不消耗弹药");
  await page.mouse.move(800, 450);
  for (const [delta, id] of [
    [100, "w0"],
    [100, "w16"],
    [100, "k0"],
    [-100, "w16"],
    [-100, "w0"],
    [-100, "k0"],
  ] as const) {
    await page.mouse.wheel(0, delta);
    await expect(page.locator(`#weapon-art [data-art="${id}"]`)).toBeVisible();
  }
  await page.keyboard.press("Digit1");
  await page.screenshot({ path: "test-results/chrome-compact-weapon-hud.png" });
});

test("实际逐件搜索仅收藏品在顶部首次提示，高品质没有右下角重复通知", async ({
  page,
}) => {
  test.setTimeout(60000);
  await start(page);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  const searched = ["m4", "a5", "h5", "f4", "w3", "c0_6", "c2_4", "c4_0"];
  await page.evaluate(async (ids) => {
    const g = (window as any).__game,
      d = await import("/src/data.ts"),
      r = g.raid,
      c = r.containers[0];
    r.enemies = [];
    g.save.collection = [];
    g.save.discovered = [];
    c.items = ids.map((id) => d.makeItem(id));
    c.revealed = 0;
    c.locked = false;
    c.cooldown = 0;
    c.x = r.p.x;
    c.y = r.p.y;
    r.near = c;
    r.containers = [c];
  }, searched);
  await page.keyboard.press("KeyE");
  for (let n = 0; n < searched.length; n++) {
    await page.evaluate(async () => {
      const r = (window as any).__game.raid,
        d = await import("/src/data.ts");
      r.searchProgress = d.searchTime(r.search.items[r.search.revealed]) - 0.02;
    });
    await expect(
      page.locator(`.loot-panel [data-item="${searched[n]}"]`),
    ).toBeVisible();
    const banner = page.locator(".discovery-card");
    if (n < 5) await expect(banner).toHaveCount(0);
    else {
      await expect(banner).toHaveAttribute("data-item", searched[n]);
      await expect(banner.locator("h2")).not.toBeEmpty();
      await expect(banner.locator(".discovery-description")).not.toBeEmpty();
      const box = await banner.boundingBox();
      expect(box!.y).toBeLessThan(70);
      expect(Math.abs(box!.x + box!.width / 2 - 720)).toBeLessThan(3);
    }
  }
  await expect(page.locator(".discovery-card")).toContainText("哇！金色传说！");
  await page.screenshot({
    path: "test-results/chrome-actual-search-legend.png",
  });
  await expect(page.locator("#toasts")).not.toContainText(
    /发现|首次|传说|稀世/,
  );
  expect(
    await page.evaluate(() => (window as any).__game.save.discovered),
  ).toEqual(searched.slice(5));
  await expect(page.locator(".discovery-card")).toHaveCount(0, {
    timeout: 12000,
  });
  await page.evaluate(async () => {
    const r = (window as any).__game.raid,
      d = await import("/src/data.ts"),
      c = r.search;
    c.items = [d.makeItem("c4_0")];
    c.revealed = 0;
    r.searchProgress = 6.99;
  });
  await expect(page.locator('.loot-panel [data-item="c4_0"]')).toBeVisible();
  await expect(page.locator(".discovery-card")).toHaveCount(0);
  await expect(page.locator("#toasts")).not.toContainText(
    /发现|首次|传说|稀世/,
  );
});

test("商店补给按价格、枪械按品质排序，图鉴仅已发现物品有悬浮描述", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "补给商店", exact: true }).click();
  const values = async (field: "tier" | "price") =>
    page.locator(".shop-grid .item-slot").evaluateAll(async (els, field) => {
      const d = await import("/src/data.ts");
      return els.map((el) => d.db[(el as HTMLElement).dataset.item!][field]);
    }, field);
  const tiers = await values("tier");
  expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  await page.locator('[data-action="category"][data-id="food"]').click();
  const prices = await values("price");
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.collection = ["c4_0"];
    g.save.discovered = ["c4_0"];
  });
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  await page.locator('.collection-item[data-id="c4_0"]').hover();
  await expect(page.locator("#item-tooltip")).toContainText("那颗非洲来的心");
  await expect(page.locator("#item-tooltip")).toContainText("星洲猫心");
  await page.screenshot({
    path: "test-results/chrome-collection-hover-description.png",
  });
  await page.locator('.collection-item[data-id="c5_14"]').hover();
  await expect(page.locator("#item-tooltip")).toHaveCount(0);
  await page.waitForTimeout(400);
  await expect(page.locator("#item-tooltip")).toHaveCount(0);
});

test("Chrome 连续停留撤离点后显示顶层结算，截图、命中测试和返回基地均正常", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts"),
      r = g.raid;
    r.enemies = [];
    g.save.pack = [d.makeItem("c4_0")];
    g.save.secure = [];
    r.elapsed = 123;
    const exit = r.exits.find((e: any) => e.active && !e.paid);
    r.p.x = exit.x;
    r.p.y = exit.y;
    r.extract = 0;
    const cover = document.createElement("div");
    cover.id = "chrome-extraction-cover";
    cover.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;background:#101820;pointer-events:none";
    document.body.append(cover);
  });
  const dialog = page.locator("#result-dialog");
  await expect(dialog).toBeVisible({ timeout: 7000 });
  expect(await dialog.evaluate((el) => el.matches(":modal"))).toBe(true);
  await expect(
    dialog.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".result-stats")).toContainText("22,750");
  await expect(dialog.locator(".result-stats")).toContainText(/2分\d+秒/);
  const button = dialog.getByRole("button", {
    name: /^一辈子花不完\s*（返回基地）$/,
  });
  expect(
    await button.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return !!document
        .elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
        ?.closest("#result-dialog");
    }),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-extraction-native-result.png",
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await button.click();
  await expect(dialog).toBeHidden();
  await page.evaluate(() =>
    document.querySelector("#chrome-extraction-cover")?.remove(),
  );
  await expect(
    page.getByRole("heading", { name: "暖窝基地", exact: true }),
  ).toBeVisible();
});
