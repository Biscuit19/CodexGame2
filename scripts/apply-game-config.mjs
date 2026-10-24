#!/usr/bin/env node
import { isDeepStrictEqual } from "node:util";
/** Apply only explicit validated configuration, never currentValues text/notes. */
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { collectTuning } from "./tuning-plugin.mjs";
const file = process.argv.find((a, i) => i > 1 && !a.startsWith("--"));
if (!file)
  throw Error("Usage: node scripts/apply-game-config.mjs path.json [--check]");
const raw = JSON.parse(await readFile(file, "utf8"));
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});
try {
  const { validateTuning } = await server.ssrLoadModule("/src/game-catalog.ts");
  const { parseBalance } = await server.ssrLoadModule("/src/audio-balance.ts");
  let tuning, audio;
  if (raw.schema === "tricat-audio-balance") audio = parseBalance(raw);
  else {
    if (raw.schema !== "tricat-game-workbench" || raw.version !== 1)
      throw Error("不是游戏调整台导出文件");
    if (raw.source?.fingerprint !== collectTuning().fingerprint)
      throw Error("来源版本已变化，先对比当前数值，不自动覆盖");
    tuning = validateTuning(raw.tuning);
    if (raw.audio) audio = parseBalance(raw.audio);
  }
  if (process.argv.includes("--check")) console.log("配置校验通过；未写入文件");
  else {
    if (tuning)
      await writeFile(
        "src/game-tuning.json",
        JSON.stringify(tuning, null, 2) + "\n",
      );
    if (audio) {
      const current = JSON.parse(
        await readFile("src/audio-balance.json", "utf8"),
      );
      const volume = (a) => ({
        buses: a.buses,
        samples: a.samples,
        cues: a.cues,
        music: a.music,
        enemyShots: a.enemyShots,
        enemyReloads: a.enemyReloads,
        settings: a.preview.settings,
      });
      audio.publishedFromExport = isDeepStrictEqual(
        volume(audio),
        volume(current),
      )
        ? current.publishedFromExport
        : (raw.exportedAt ?? new Date().toISOString());
      delete audio.exportedAt;
      await writeFile(
        "src/audio-balance.json",
        JSON.stringify(audio, null, 2) + "\n",
      );
    }
    console.log(
      "已应用",
      tuning ? "游戏数值" : "",
      audio ? "音量" : "",
      "；重新构建后发布生效",
    );
  }
} finally {
  await server.close();
}
