import { test, expect } from "@playwright/test";
test("交易与界面40候选：来源作者、原声/片段可解码、选择复制及停止", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/audio-review/commerce/index.html");
  await expect(page.locator("#categories button")).toHaveCount(4);
  await expect(page.locator(".candidate")).toHaveCount(10);
  await expect(page.locator("#volume")).toHaveValue("100");
  for (const [g, id] of [
    ["buy", "BU1"],
    ["sell", "SE4"],
    ["discard", "DP1"],
    ["click", "CL4"],
  ]) {
    await page.locator(`[data-category="${g}"]`).click();
    await expect(page.locator(".candidate")).toHaveCount(10);
    await page.getByRole("button", { name: "选择 " + id, exact: true }).click();
    await page
      .getByRole("button", { name: "动作试听 " + id, exact: true })
      .click();
    await expect(page.locator("#status")).toHaveText("试听结束。");
  }
  await page.locator("#sequence").click();
  await page.locator("#stop").click();
  await expect(page.locator("#sequence")).toBeEnabled();
  const verified = await page.evaluate(async () => {
    const m = await (await fetch("manifest-v1.json")).json(),
      ctx = new AudioContext();
    if (m.installedToGame !== false) throw Error("Unapproved installation");
    for (const g of m.groups)
      if (new Set(g.candidates.map((c: any) => c.author)).size !== 10)
        throw Error("Author duplicate " + g.id);
    if (
      new Set(Object.values(m.sources).map((s: any) => s.sourceSha256)).size !==
      40
    )
      throw Error("Repeated original");
    const entries: any[] = [
      ...Object.values(m.sources),
      ...m.groups.flatMap((g: any) =>
        g.candidates.map((c: any) => c.versions[0]),
      ),
    ];
    const unique = [...new Map(entries.map((e) => [e.url, e])).values()];
    for (const e of unique) {
      const r = await fetch(e.url);
      if (!r.ok) throw Error(e.url);
      const b = await r.arrayBuffer(),
        h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", b))]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      if (h !== e.sha256) throw Error("Hash " + e.url);
      const a = await ctx.decodeAudioData(b);
      if (Math.abs(a.duration - e.duration) > 0.001)
        throw Error("Duration " + e.url);
    }
    const raw = await (
        await fetch("licenses/Jute-bag-1-original.wav")
      ).arrayBuffer(),
      hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", raw))]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    if (hash !== m.sources["discard-4"].sourceSha256)
      throw Error("Missing corresponding source");
    await ctx.close();
    return unique.length;
  });
  expect(verified).toBe(80);
  await page.locator("#export").click();
  await expect(page.locator("#copy-dialog")).toBeVisible();
  await expect(page.locator("#copy-text")).toHaveValue(
    /BU1[\s\S]*SE4[\s\S]*DP1[\s\S]*CL4/,
  );
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.screenshot({
    path: "test-results/chrome-commerce-audio-desktop.png",
  });
});
test("手机交易音效选择、复制与弹窗关闭可见", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/audio-review/commerce/index.html");
  await expect(page.locator(".candidate")).toHaveCount(10);
  await page.getByRole("button", { name: "选择 BU2", exact: true }).click();
  await page.locator("#export").click();
  await expect(page.locator("#copy-text")).toHaveValue(/BU2/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/chrome-commerce-audio-mobile.png",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.locator("#copy-dialog")).not.toBeVisible();
});
