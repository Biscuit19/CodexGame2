export const musicNames = {
  ORIGINAL: "暖窝基地 · 原始配乐",
  BG3: "静静的小镇 · Calm BGM",
  BG5: "蓝莓 · Blueberries",
  BG6: "安静角落 · Peaceful Place",
  BG10: "祥和村庄 · Peaceful Village",
  NB2: "草甸心绪 · Meadow Thoughts",
  NB3: "慢慢想起 · Where Was I?",
  NB5: "小小篝火 · A Small Fire Will Do",
  NB6: "蜂蜜小熊 · Honey Bear",
  NB10: "森林圆舞曲 · Sylvan Waltz",
  PM05: "蓝帽花 · Bluebonnet",
  PM06: "勿忘我 · Forget Me Not",
  PM08: "水晶洞穴 · Crystal Caves",
  PM12: "五月凌晨一点 · Peaceful 1am in May",
  PM16: "静思即兴曲02 · Meditation Impromptu 02",
  PM18: "静静遐想 · Reverie",
  PM20: "前奏曲二十三 · Prelude No. 23",
} as const;
export type MusicTrack = keyof typeof musicNames;

export const baseMusicNames = {
  ORIGINAL: musicNames.ORIGINAL,
  PM05: musicNames.PM05,
  PM06: musicNames.PM06,
  PM08: musicNames.PM08,
  PM12: musicNames.PM12,
  PM16: musicNames.PM16,
  PM18: musicNames.PM18,
  PM20: musicNames.PM20,
} as const;
export type BaseMusicTrack = keyof typeof baseMusicNames;
export const gameMusicNames = Object.fromEntries(
  Object.entries(musicNames).filter(
    ([key]) =>
      key !== "ORIGINAL" &&
      (!key.startsWith("PM") || ["PM08", "PM12"].includes(key)),
  ),
) as Pick<
  typeof musicNames,
  Exclude<MusicTrack, "ORIGINAL" | "PM05" | "PM06" | "PM16" | "PM18" | "PM20">
>;
