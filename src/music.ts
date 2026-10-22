import { musicNames } from "./music-catalog";
export type { MusicTrack } from "./music-catalog";
import original from "./assets/audio/music-original.flac?url";
import bg3 from "./assets/audio/music-bg3.ogg?url";
import bg5 from "./assets/audio/music-bg5.mp3?url";
import bg6 from "./assets/audio/music-bg6.mp3?url";
import bg10 from "./assets/audio/music-bg10.flac?url";
import nb2 from "./assets/audio/music-nb2.ogg?url";
import nb3 from "./assets/audio/music-nb3.ogg?url";
import nb5 from "./assets/audio/music-nb5.wav?url";
import nb6 from "./assets/audio/music-nb6.mp3?url";
import nb10 from "./assets/audio/music-nb10.mp3?url";
export const musicTracks = {
  ORIGINAL: {
    url: original,
    gain: 0.9649393118055822,
    name: musicNames.ORIGINAL,
  },
  BG3: { url: bg3, gain: 1.7701089583174212, name: musicNames.BG3 },
  BG5: { url: bg5, gain: 0.2633297943675514, name: musicNames.BG5 },
  BG6: { url: bg6, gain: 0.5388898453732868, name: musicNames.BG6 },
  BG10: { url: bg10, gain: 3.5933539675538984, name: musicNames.BG10 },
  NB2: { url: nb2, gain: 0.3463378846082794, name: musicNames.NB2 },
  NB3: { url: nb3, gain: 0.5629891173942434, name: musicNames.NB3 },
  NB5: { url: nb5, gain: 0.8156427871327874, name: musicNames.NB5 },
  NB6: { url: nb6, gain: 0.5176068319505678, name: musicNames.NB6 },
  NB10: { url: nb10, gain: 0.3832657404000346, name: musicNames.NB10 },
} as const;
