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
import pm05 from "./assets/audio/music-pm05.mp3?url";
import pm06 from "./assets/audio/music-pm06.ogg?url";
import pm08 from "./assets/audio/music-pm08.mp3?url";
import pm12 from "./assets/audio/music-pm12.mp3?url";
import pm16 from "./assets/audio/music-pm16.mp3?url";
import pm18 from "./assets/audio/music-pm18.mp3?url";
import pm20 from "./assets/audio/music-pm20.m4a?url";
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
  PM05: { url: pm05, gain: 0.6194410750767814, name: musicNames.PM05 },
  PM06: { url: pm06, gain: 0.8308067187019145, name: musicNames.PM06 },
  PM08: { url: pm08, gain: 0.6449113198681057, name: musicNames.PM08 },
  PM12: { url: pm12, gain: 0.5357966575133415, name: musicNames.PM12 },
  PM16: { url: pm16, gain: 0.8974287945007483, name: musicNames.PM16 },
  PM18: { url: pm18, gain: 0.3265878321723358, name: musicNames.PM18 },
  PM20: { url: pm20, gain: 0.6966265141107687, name: musicNames.PM20 },
} as const;
