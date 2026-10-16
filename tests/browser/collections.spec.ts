import { test, expect, type Page } from "@playwright/test";

async function start(page: Page) {
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "开始游戏", exact: true }).click();
  await page
    .getByRole("button", { name: "创建并进入基地", exact: true })
    .click();
}

test("60件收藏使用独立彩色PNG，只有已发现物品可以打开幽默描述", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.collection = ["c2_7"];
    g.render();
  });
  await page.getByRole("button", { name: "收藏图鉴", exact: true }).click();
  await expect(page.locator(".collection-item")).toHaveCount(60);
  await expect(page.locator(".collection-item .item-art")).toHaveCount(60);
  await expect(page.locator(".collection-item svg")).toHaveCount(0);
  await expect(page.locator('.collection-item[data-id="c4_0"]')).toBeDisabled();
  await page.locator('.collection-item[data-id="c2_7"]').click();
  await expect(page.locator(".collection-description")).toHaveText(
    "车不一定会来，附近的猫一定会来。",
  );
  await page.screenshot({ path: "test-results/collectible-description.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator(".collection-description")).toHaveCount(0);
  await page.evaluate(() => {
    const g = (window as any).__game;
    g.save.collection = Array.from(
      document.querySelectorAll<HTMLElement>(".collection-item"),
      (el) => el.dataset.id,
    );
    g.render();
  });
  const atlases = await page
    .locator(".collection-item .art-glyph")
    .evaluateAll(async (els) => {
      const urls = [
        ...new Set(
          els.map((el) =>
            (el as HTMLElement).style.backgroundImage.slice(5, -2),
          ),
        ),
      ];
      for (const url of urls) {
        const img = new Image();
        img.src = url;
        await img.decode();
        if (!img.naturalWidth) throw Error("PNG加载失败");
      }
      return {
        count: urls.length,
        unique: new Set(els.map((el) => (el as HTMLElement).style.cssText))
          .size,
      };
    });
  expect(atlases).toEqual({ count: 3, unique: 60 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(900, 700);
  await page.mouse.wheel(0, 800);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(400);
  await page.screenshot({
    path: "test-results/all-collectibles.png",
    fullPage: true,
  });
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 1000 },
]) {
  test(`装备和安全箱常驻，可从背包底部拖枪、主副互换和空位移动 ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await start(page);
    await page.evaluate(async () => {
      const g = (window as any).__game,
        d = await import("/src/data.ts");
      g.save.equipment.primary = d.makeItem("w3");
      g.save.equipment.secondary = d.makeItem("w16");
      g.save.equipment.primary.loaded = { tier: 2, count: 17 };
      g.save.equipment.secondary.loaded = { tier: 1, count: 4 };
      g.render();
    });
    await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
    const primary = () => page.locator('[data-slot="primary"] .equipped-item');
    const secondary = () =>
      page.locator('[data-slot="secondary"] .equipped-item');
    await primary().dragTo(page.locator('[data-slot="secondary"]'));
    await expect(primary()).toHaveAttribute("data-item", "w16");
    await expect(secondary()).toHaveAttribute("data-item", "w3");
    expect(
      await page.evaluate(
        () => (window as any).__game.save.equipment.secondary.loaded.count,
      ),
    ).toBe(17);
    await page.evaluate(() => {
      const g = (window as any).__game;
      g.save.equipment.primary = null;
      g.render();
    });
    await secondary().dragTo(page.locator('[data-slot="primary"]'));
    await expect(primary()).toHaveAttribute("data-item", "w3");
    await expect(secondary()).toBeDisabled();
    await page.getByRole("button", { name: "返回基地", exact: true }).click();
    await page.getByRole("button", { name: "进入地图一", exact: true }).click();
    await page.getByRole("button", { name: "开始行动", exact: true }).click();
    await page.evaluate(async () => {
      const g = (window as any).__game,
        d = await import("/src/data.ts");
      g.raid.enemies = [];
      g.save.safe = 3;
      g.save.secure = Array.from({ length: 6 }, (_, i) =>
        d.makeItem(`c4_${i}`),
      );
      g.save.equipment.bag = d.makeItem("b5");
      g.save.pack = Array.from({ length: 74 }, () => d.makeItem("c0_0"));
      g.save.pack.push(d.makeItem("w19"));
      g.render();
    });
    await page.keyboard.press("Tab");
    await expect(
      page.getByText("六命保险箱（安全箱）", { exact: true }),
    ).toBeVisible();
    const before = await primary().boundingBox();
    await page.locator(".inventory-scroll").hover();
    await page.mouse.wheel(0, 9000);
    await expect
      .poll(() =>
        page.locator(".inventory-scroll").evaluate((el) => el.scrollTop),
      )
      .toBeGreaterThan(500);
    await expect(primary()).toHaveAttribute("data-item", "w3");
    const gun = page.locator('[data-grid="pack"] [data-item="w19"]');
    await expect(gun).toBeInViewport();
    await expect(primary()).toBeInViewport();
    expect((await primary().boundingBox())!.y).toBe(before!.y);
    const safe = await page.locator(".safe-fixed").boundingBox();
    expect(safe!.y + safe!.height).toBeLessThan(viewport.height);
    const tops = await page
      .locator('[data-grid="secure"] > *')
      .evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().top)),
      );
    expect(new Set(tops).size).toBe(1);
    await gun.dragTo(page.locator('[data-slot="primary"]'));
    await expect(primary()).toHaveAttribute("data-item", "w19");
    await primary().dragTo(page.locator('[data-slot="secondary"]'));
    await expect(secondary()).toHaveAttribute("data-item", "w19");
    await expect(primary()).toBeDisabled();
    await secondary().dragTo(page.locator('[data-slot="primary"]'));
    await expect(primary()).toHaveAttribute("data-item", "w19");
    const scroller = page.locator(".inventory-scroll");
    await scroller.evaluate((el) => (el.scrollTop = 0));
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await page
      .locator('[data-grid="pack"] .item-slot')
      .first()
      .dispatchEvent("dragstart", { dataTransfer: transfer });
    const scrollRect = await scroller.boundingBox();
    await scroller.dispatchEvent("dragover", {
      dataTransfer: transfer,
      clientY: scrollRect!.y + scrollRect!.height - 4,
    });
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(50);
    await page.evaluate(() =>
      document.dispatchEvent(new DragEvent("dragend", { bubbles: true })),
    );
    await transfer.dispose();
    await page.screenshot({
      path: `test-results/inventory-fixed-${viewport.width}.png`,
    });
  });
}

test("撤离显示实际物资价值和鼓励按钮，仓库每次打开默认按类型与价值排列", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "进入地图一", exact: true }).click();
  await page.getByRole("button", { name: "开始行动", exact: true }).click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.raid.enemies = [];
    g.save.pack = [d.makeItem("c4_0"), d.makeItem("f1")];
    g.save.secure = [];
    g.raid.value = 999999;
    g.raid.elapsed = 123;
    g.raid.finish(true, "成功撤离");
  });
  await expect(
    page.getByRole("heading", { name: "成功撤离", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText("22,828");
  await expect(page.locator(".result-stats")).toContainText("2分3秒");
  await expect(page.locator('[data-action="close-result"]')).toHaveText(
    "一辈子花不完（返回基地）",
  );
  await page.screenshot({ path: "test-results/extraction-success.png" });
  await page.locator('[data-action="close-result"]').click();
  await page.evaluate(async () => {
    const g = (window as any).__game,
      d = await import("/src/data.ts");
    g.save.stash = ["c4_0", "f1", "w0", "m2", "w11", "a1", "h1", "b1"].map(
      (id) => d.makeItem(id),
    );
  });
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(page.locator("#sort")).toHaveValue("type");
  expect(
    await page
      .locator('[data-grid="stash"] [data-item]')
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.item)),
  ).toEqual(["w11", "w0", "a1", "h1", "b1", "m2", "f1", "c4_0"]);
  await page.locator("#sort").selectOption("value");
  await page.getByRole("button", { name: "返回基地", exact: true }).click();
  await page.getByRole("button", { name: "仓库与整备", exact: true }).click();
  await expect(page.locator("#sort")).toHaveValue("type");
});
