import { it, expect, vi } from "vitest";
import { timestampSuffix } from "../../src/config-time";
import { defaults, newSave, validateSave, buy } from "../../src/store";
import { defaultBalance } from "../../src/audio-balance";
import { sampleBank } from "../../src/audio-samples";
import { weightedItem } from "../../src/game-tuning-runtime";
import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdtemp,
  cp,
  mkdir,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
// @ts-ignore source extraction also serves Vite and the import CLI.
import { collectTuning, tuningPlugin } from "../../scripts/tuning-plugin.mjs";
it("应用上传音量及SC1原文件；文件名明确时区和毫秒", async () => {
  const raw = JSON.parse(
    await readFile(
      "docs/config-history/game-audio-20261024T203109_642+0800.json",
      "utf8",
    ),
  );
  const selected=raw.audio;
  expect(defaultBalance.buses).toEqual(selected.buses);
  expect(defaultBalance.samples.click).toBe(selected.samples.click);
  for (const k of Object.keys(selected.samples))
    expect((defaultBalance.samples as any)[k]).toBe(selected.samples[k]);
  expect(defaultBalance.enemyShots).toBe(0.71);
  expect(defaultBalance.enemyReloads).toBe(0);
  expect(defaults).toMatchObject({ master: 1, music: 0.8, sfx: 1 });
  const metadata = JSON.parse(
    await readFile("src/assets/audio/approved-click.json", "utf8"),
  );
  expect(
    createHash("sha256")
      .update(await readFile("src/assets/audio/click.flac"))
      .digest("hex"),
  ).toBe(metadata.sha256);
  expect(Object.keys(sampleBank)).toHaveLength(52);
  expect(timestampSuffix(new Date("2026-10-24T10:13:37.654Z"))).toBe(
    "20261024T181337_654+0800",
  );
});
it("加权选择保持原来等权随机语义，0权重不参与随机池", () => {
  const a = [{ id: 1 }, { id: 2 }, { id: 3 }];
  for (const x of [0, 0.1, 0.5, 0.999999])
    expect(weightedItem(a, () => x)).toEqual(a[Math.floor(x * a.length)]);
  expect(
    weightedItem(
      [
        { id: 1, lootWeight: 0 },
        { id: 2, lootWeight: 1 },
      ],
      () => 0,
    ).id,
  ).toBe(2);
});
it("提取目录来自真实源代码，概率组与索引保护、数值ID唯一", () => {
  const c = collectTuning();
  expect(c.entries.length).toBeGreaterThan(1500);
  expect(new Set(c.entries.map((e: any) => e.id)).size).toBe(c.entries.length);
  expect(c.entries.filter((e: any) => e.probabilityGroup)).toHaveLength(65);
  const drain = c.entries.filter(
    (e: any) => e.label === "移动与体力 / 每秒体力消耗",
  );
  expect(drain).toHaveLength(1);
  expect(drain[0].value).toBeCloseTo(100 / 30);
  expect(
    c.entries.find((e: any) => e.label === "移动与体力 / 持枪移动速度").value,
  ).toBe(220);
  expect(c.entries.some((e: any) => e.description.includes("0x6d2b79f5"))).toBe(
    false,
  );
  const neg = c.entries.find((e: any) => e.base < 0);
  expect(neg).toBeTruthy();
});
it("导出配置实际改变战斗数值、购买价和每类容器数量；无效配置拒绝", async () => {
  const root = await mkdtemp(join(tmpdir(), "tricat-tuning-test-"));
  let server: any;
  try {
    await mkdir(join(root, "src"), { recursive: true });
    for (const file of [
      "data.ts",
      "store.ts",
      "raid.ts",
      "village.ts",
      "navigation.ts",
      "container-info.ts",
      "locomotion.ts",
      "knife-motion.ts",
      "reload-motion.ts",
      "game-catalog.ts",
      "game-tuning-runtime.ts",
      "game-tuning.json",
      "collectibles.ts",
      "audio.ts",
      "audio-samples.ts",
      "audio-balance.ts",
      "audio-balance.json",
      "music.ts",
      "music-catalog.ts",
      "player-tail.ts",
    ])
      await cp("src/" + file, join(root, "src", file));
    await symlink(
      join(process.cwd(), "src/assets"),
      join(root, "src/assets"),
      "dir",
    );
    const catalog = collectTuning(root),
      speed = catalog.entries.find(
        (e: any) => e.label === "移动与体力 / 持枪移动速度",
      ),
      hp = catalog.entries.find((e: any) => e.label === "玩家最大生命");
    const patch = {
      schema: "tricat-game-tuning",
      version: 1,
      numbers: {
        [speed.id]: { base: speed.base, value: 300 },
        [hp.id]: { base: hp.base, value: 180 },
      },
      items: { w3: { damage: 77, buyPrice: 1111 } },
      containers: { box: 5 },
    };
    await writeFile(join(root, "src/game-tuning.json"), JSON.stringify(patch));
    server = await createServer({
      root,
      configFile: false,
      plugins: [tuningPlugin()],
      server: { middlewareMode: true },
      appType: "custom",
      logLevel: "error",
    });
    const d = await server.ssrLoadModule("/src/data.ts"),
      c = await server.ssrLoadModule("/src/game-catalog.ts"),
      st = await server.ssrLoadModule("/src/store.ts");
    expect(d.MOVEMENT.runSpeed).toBe(300);
    expect(d.PLAYER_MAX_HP).toBe(180);
    expect(d.db.w3.damage).toBe(77);
    expect(c.currentContainers.box).toBe(5);
    expect(() => c.validateTuning(patch)).not.toThrow();
    expect(() =>
      c.validateTuning({
        ...patch,
        numbers: { missing: { base: 1, value: 2 } },
      }),
    ).toThrow();
    expect(() =>
      c.validateTuning({ ...patch, items: { w3: { reload: -1 } } }),
    ).toThrow();
    const probability = c.catalog.entries.find((e: any) => e.probabilityGroup);
    expect(() =>
      c.validateTuning({
        ...patch,
        numbers: { [probability.id]: { base: probability.base, value: 0.5 } },
      }),
    ).toThrow("100%");
    Object.assign(globalThis, {
      window: {},
      localStorage: { getItem: () => null, setItem: () => {} },
    });
    const save = st.newSave();
    save.temporary = true;
    save.coins = 1200;
    expect(st.buy(save, "w3")).toBe(true);
    expect(save.coins).toBe(89);
    const { Raid } = await server.ssrLoadModule("/src/raid.ts");
    const r = new Raid(
      save,
      0,
      { play: () => {}, mode: "base" },
      () => {},
      () => {},
      () => {},
      42,
    );
    expect(r.p.hp).toBe(180);
    const boxes = r.containers.filter((v: any) => v.type === "box");
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((v: any) => v.items.length === 5)).toBe(true);
  } finally {
    await server?.close();
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
