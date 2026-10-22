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
} as const;
export type MusicTrack = keyof typeof musicNames;
