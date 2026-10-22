import bg3 from "./assets/audio/music-bg3.ogg?url";
import bg5 from "./assets/audio/music-bg5.mp3?url";
import bg6 from "./assets/audio/music-bg6.mp3?url";
import bg10 from "./assets/audio/music-bg10.flac?url";
export const musicTracks = {
  BG3: { url: bg3, gain: 1.7701089583174212, name: "静静的小镇 · Calm BGM" },
  BG5: { url: bg5, gain: 0.2633297943675514, name: "蓝莓 · Blueberries" },
  BG6: {
    url: bg6,
    gain: 0.5388898453732868,
    name: "安静角落 · Peaceful Place",
  },
  BG10: {
    url: bg10,
    gain: 3.5933539675538984,
    name: "祥和村庄 · Peaceful Village",
  },
} as const;
export type MusicTrack = keyof typeof musicTracks;
