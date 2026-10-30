import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { baseMusicNames, gameMusicNames } from "../../src/music-catalog";
import { newSave, validateSave } from "../../src/store";
import { parseBalance, defaultBalance } from "../../src/audio-balance";
Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
});
describe("基地与游戏音乐分开", () => {
  it("基地与游戏新选曲严格分组，旧存档音乐和音量安全迁移", () => {
    expect(Object.keys(baseMusicNames)).toEqual([
      "ORIGINAL",
      "PM05",
      "PM06",
      "PM08",
      "PM12",
      "PM16",
      "PM18",
      "PM20",
    ]);
    expect(Object.keys(gameMusicNames)).toHaveLength(11);
    expect(gameMusicNames).not.toHaveProperty("ORIGINAL");
    const s = newSave();
    s.settings.musicTrack = "NB2";
    s.settings.music = 0.35;
    delete s.settings.baseMusic;
    delete s.settings.baseMusicTrack;
    const valid = validateSave(s);
    expect(valid.settings.baseMusic).toBe(0.35);
    expect(valid.settings.baseMusicTrack).toBe("ORIGINAL");
    expect(valid.settings.musicTrack).toBe("NB2");
    s.settings.musicTrack = "ORIGINAL";
    expect(validateSave(s).settings.musicTrack).toBe("BG5");
    s.settings.baseMusic = 2;
    expect(() => validateSave(s)).toThrow("基地音乐音量");
  });
  it("获选7首保留原文件与响度基线，基地与游戏列表按最终选择接入", async () => {
    const { musicTracks } = await import("../../src/music");
    const approved = JSON.parse(
      readFileSync("src/assets/audio/approved-peaceful-music.json", "utf8"),
    );
    expect(approved.base).toEqual([
      "PM05",
      "PM06",
      "PM08",
      "PM12",
      "PM16",
      "PM18",
      "PM20",
    ]);
    expect(approved.game).toEqual(["PM08", "PM12"]);
    for (const t of approved.tracks) {
      const suffix = t.url.slice(t.url.lastIndexOf(".")),
        file = `src/assets/audio/music-${t.id.toLowerCase()}${suffix}`;
      expect(
        createHash("sha256").update(readFileSync(file)).digest("hex"),
      ).toBe(t.sha256);
      const gain = (musicTracks as any)[t.id].gain;
      expect(t.inputLufs + 20 * Math.log10(gain)).toBeCloseTo(-24, 2);
    }
  });
  it("调音JSON兼容旧三滑块，新增基地音量单独导入", () => {
    const old = structuredClone(defaultBalance);
    delete (old.preview.settings as any).baseMusic;
    expect(parseBalance(old).preview.settings.baseMusic).toBe(
      old.preview.settings.music,
    );
    old.preview.settings.baseMusic = 0.2;
    expect(parseBalance(old).preview.settings.baseMusic).toBe(0.2);
    expect(parseBalance(old).preview.settings.music).toBe(0.8);
    old.preview.settings.baseMusic = -1;
    expect(() => parseBalance(old)).toThrow("基地试听音量");
  });
  it("20首候选文件完整且哈希匹配，15位作者，许可证明确，不进入游戏离线缓存", () => {
    const m = JSON.parse(
      readFileSync("public/audio-review/peaceful-music/manifest.json", "utf8"),
    );
    expect(m.previewOnly).toBe(true);
    expect(m.tracks).toHaveLength(20);
    expect(new Set(m.tracks.map((t: any) => t.author)).size).toBe(15);
    for (const t of m.tracks) {
      const b = readFileSync("public/audio-review/peaceful-music/" + t.url);
      expect(createHash("sha256").update(b).digest("hex")).toBe(t.sha256);
      expect(t.whole).toBe(true);
      expect(t.duration).toBeGreaterThan(20);
      expect(["CC0-1.0", "CC-BY-3.0", "CC-BY-4.0"]).toContain(t.license);
      expect(t.gain).toBeGreaterThan(0);
      expect(t.inputPeakDb + t.gainDb).toBeLessThanOrEqual(-0.99);
    }
    expect(readFileSync("scripts/sw.mjs", "utf8")).toContain(
      '!f.includes("/audio-review/peaceful-music/")',
    );
  });
});
