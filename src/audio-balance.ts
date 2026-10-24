import defaults from "./audio-balance.json";
import { musicNames } from "./music-catalog";
export type AudioBalance = typeof defaults & {
  samples: Record<string, number>;
  cues: Record<string, number>;
  music: Record<string, number>;
};
export const defaultBalance: AudioBalance = defaults;
export function parseBalance(value: unknown): AudioBalance {
  const v = value as AudioBalance;
  if (
    !v ||
    v.schema !== defaults.schema ||
    v.version !== 1 ||
    v.revision !== defaults.revision
  )
    throw Error("配置版本不匹配，请使用当前调音页面导出的文件");
  const valid = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 4;
  if (
    !v.buses ||
    ![
      v.buses.master,
      v.buses.music,
      v.buses.effects,
      v.enemyShots,
      v.enemyReloads,
    ].every(valid)
  )
    throw Error("音量必须在0到4之间");
  for (const k of ["samples", "cues", "music"] as const)
    if (
      !v[k] ||
      typeof v[k] !== "object" ||
      Array.isArray(v[k]) ||
      !Object.values(v[k]).every(valid)
    )
      throw Error("无效的分类音量");
  if (
    !v.preview ||
    !v.preview.settings ||
    ![
      v.preview.settings.master,
      v.preview.settings.music,
      v.preview.settings.sfx,
    ].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) ||
    !Object.hasOwn(musicNames, v.preview.track)
  )
    throw Error("试听环境的音量或曲目无效");
  return structuredClone(v);
}
