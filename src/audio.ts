import type { Settings } from "./store";
import {
  sampleBank,
  sampleChoice,
  type SampleKey,
  type SoundOptions,
} from "./audio-samples";
// Licensed gun/foley recordings are bundled locally; credits are linked from settings.
// Whole licensed music streams locally; unrelated UI cues remain synthesized.
import { musicTracks, type MusicTrack } from "./music";
export class Sound {
  ctx?: AudioContext;
  master?: GainNode;
  musicBus?: GainNode;
  effects?: GainNode;
  settings: Settings;
  private currentMode = "base";
  get mode() {
    return this.currentMode;
  }
  set mode(value: string) {
    if (value === "base" && this.currentMode !== "base") this.stopSamples();
    const changedArea = (this.currentMode === "base") !== (value === "base");
    this.currentMode = value;
    if (changedArea) this.syncMusic();
  }
  buffers = new Map<SampleKey, AudioBuffer>();
  private loading = new Map<SampleKey, Promise<AudioBuffer | undefined>>();
  private voices = new Set<AudioBufferSourceNode>();
  private reloadVoice?: AudioBufferSourceNode;
  private foodVoice?: AudioBufferSourceNode;
  private discoveryVoice?: AudioBufferSourceNode;
  private discoveryGeneration = 0;
  stopDiscovery() {
    this.discoveryGeneration++;
    try {
      this.discoveryVoice?.stop();
    } catch {}
    this.discoveryVoice = undefined;
  }
  private generation = 0;
  private reloadGeneration = 0;
  private foodGeneration = 0;
  private callTimes = new Map<string, number>();
  private callVoices = new Map<string, AudioBufferSourceNode>();
  async prepare() {
    if (!this.ctx) return;
    await Promise.all(
      (Object.keys(sampleBank) as SampleKey[]).map((key) =>
        this.loadSample(key),
      ),
    );
  }
  private loadSample(key: SampleKey) {
    if (this.buffers.has(key)) return Promise.resolve(this.buffers.get(key));
    let promise = this.loading.get(key);
    if (!promise) {
      promise = fetch(sampleBank[key])
        .then((r) => {
          if (!r.ok) throw Error(`音效资源不可用：${key}`);
          return r.arrayBuffer();
        })
        .then((b) => this.ctx!.decodeAudioData(b))
        .then((b) => {
          this.buffers.set(key, b);
          return b;
        })
        .catch((error) => {
          this.loading.delete(key);
          console.warn(error);
          return undefined;
        });
      this.loading.set(key, promise);
    }
    return promise;
  }
  stopReload() {
    this.reloadGeneration++;
    try {
      this.reloadVoice?.stop();
    } catch {
      /* Already ended. */
    }
    this.reloadVoice = undefined;
  }
  stopSamples() {
    this.generation++;
    this.stopReload();
    this.stopFood();
    this.stopDiscovery();
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.voices.clear();
    this.callTimes.clear();
    this.callVoices.clear();
  }
  stopFood() {
    this.foodGeneration++;
    try {
      this.foodVoice?.stop();
    } catch {
      /* Already ended. */
    }
    this.foodVoice = undefined;
  }
  private sample(name: string, options: SoundOptions) {
    const choice = sampleChoice(name, options);
    if (!choice || !this.ctx) return false;
    const isCall = name === "hurt" || name === "enemy-alert";
    const isDiscovery = name === "loot" || name === "unlock";
    if (isDiscovery) this.stopDiscovery();
    const discoveryGeneration = this.discoveryGeneration;
    if (isCall) {
      const last = this.callTimes.get(name) ?? -Infinity;
      if (this.ctx.currentTime - last < (name === "hurt" ? 0.35 : 0.7))
        return true;
      this.callTimes.set(name, this.ctx.currentTime);
    }
    if (choice.reload) this.stopReload();
    if (choice.food) this.stopFood();
    const generation = this.generation,
      reloadGeneration = this.reloadGeneration,
      foodGeneration = this.foodGeneration;
    const requested = this.ctx.currentTime;
    const play = (buffer?: AudioBuffer) => {
      if (
        !buffer ||
        !this.ctx ||
        generation !== this.generation ||
        (isDiscovery && discoveryGeneration !== this.discoveryGeneration) ||
        (choice.reload && reloadGeneration !== this.reloadGeneration) ||
        (choice.food && foodGeneration !== this.foodGeneration)
      )
        return;
      const age = this.ctx.currentTime - requested;
      // Don't release a burst of old gunshots after asynchronous first-use decoding.
      if ((name === "shot" || name === "enemy") && age > 0.12) return;
      if (isCall && age > 0.4) return;
      if (isCall) {
        try {
          this.callVoices.get(name)?.stop();
        } catch {}
      }
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain();
      source.buffer = buffer;
      const rate = choice.seconds ? buffer.duration / choice.seconds : 1;
      source.playbackRate.value = rate;
      gain.gain.value = choice.gain;
      source.connect(gain);
      gain.connect(this.effects!);
      if (this.voices.size >= 40) {
        const oldest = this.voices.values().next().value;
        try {
          oldest?.stop();
        } catch {
          /* The oldest voice may already have ended. */
        }
        if (oldest) this.voices.delete(oldest);
      }
      this.voices.add(source);
      if (choice.reload) this.reloadVoice = source;
      if (choice.food) this.foodVoice = source;
      if (isDiscovery) this.discoveryVoice = source;
      if (isCall) this.callVoices.set(name, source);
      source.onended = () => {
        this.voices.delete(source);
        source.disconnect();
        gain.disconnect();
        if (this.reloadVoice === source) this.reloadVoice = undefined;
        if (this.foodVoice === source) this.foodVoice = undefined;
        if (this.discoveryVoice === source) this.discoveryVoice = undefined;
        if (this.callVoices.get(name) === source) this.callVoices.delete(name);
      };
      const offset = choice.seconds ? age * rate : 0;
      if (offset >= buffer.duration) {
        if (this.reloadVoice === source) this.reloadVoice = undefined;
        if (this.foodVoice === source) this.foodVoice = undefined;
        if (this.discoveryVoice === source) this.discoveryVoice = undefined;
        this.voices.delete(source);
        source.disconnect();
        gain.disconnect();
        return;
      }
      source.start(0, offset);
    };
    const buffer = this.buffers.get(choice.key);
    if (buffer) play(buffer);
    else void this.loadSample(choice.key).then(play);
    return true;
  }
  private musicElement?: HTMLAudioElement;
  private trackGain?: GainNode;
  private musicKey?: MusicTrack;
  private musicSelection = "";
  private musicRequest = 0;
  private musicFailed = false;
  get currentMusic() {
    return this.musicKey;
  }
  private syncMusic() {
    if (!this.ctx || !this.musicBus) return;
    const picked =
      this.mode === "base" ? "ORIGINAL" : (this.settings.musicTrack ?? "BG5");
    const mode =
      this.mode === "base" ? "loop" : (this.settings.musicMode ?? "loop");
    const signature = `${this.mode === "base" ? "base" : "raid"}:${picked}:${mode}`;
    if (!this.musicElement) {
      this.musicElement = new Audio();
      this.musicElement.preload = "none";
      this.trackGain = this.ctx.createGain();
      this.ctx
        .createMediaElementSource(this.musicElement)
        .connect(this.trackGain);
      this.trackGain.connect(this.musicBus);
      this.musicElement.addEventListener("ended", () => {
        if (this.mode !== "base" && this.settings.musicMode === "random")
          this.nextMusic();
      });
      document.addEventListener("visibilitychange", () => this.syncMusic());
    }
    if (signature !== this.musicSelection) {
      this.musicSelection = signature;
      this.musicFailed = false;
      this.setMusic(picked in musicTracks ? picked : "BG5");
    }
    this.musicElement.loop = mode === "loop";
    if (!this.settings.master || !this.settings.music || document.hidden) {
      this.musicRequest++;
      this.musicElement.pause();
    } else if (this.musicElement.paused && !this.musicFailed) {
      const request = ++this.musicRequest;
      void this.musicElement.play().catch((error) => {
        if (request !== this.musicRequest) return;
        if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
          this.musicFailed = true;
          console.warn("背景音乐暂时不可用", error);
        }
      });
    }
  }
  private setMusic(key: MusicTrack) {
    const audio = this.musicElement!;
    this.musicRequest++;
    audio.pause();
    this.musicKey = key;
    this.trackGain!.gain.value = musicTracks[key].gain;
    audio.src = musicTracks[key].url;
  }
  private nextMusic() {
    const keys = (Object.keys(musicTracks) as MusicTrack[]).filter(
      (k) => k !== this.musicKey,
    );
    this.setMusic(keys[Math.floor(Math.random() * keys.length)]);
    this.syncMusic();
  }
  constructor(settings: Settings) {
    this.settings = settings;
  }
  start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.effects = this.ctx.createGain();
      this.effects.connect(this.master);
      this.apply();
    }
    void this.ctx.resume().catch(() => {});
    void this.prepare();
    this.syncMusic();
  }
  apply() {
    if (this.master) {
      this.master.gain.value = this.settings.master * 1.3;
      this.musicBus!.gain.value = this.settings.music * 0.35 * 0.8;
      this.effects!.gain.value = this.settings.sfx * 0.5;
      this.syncMusic();
    }
  }
  note(
    freq: number,
    duration = 0.12,
    type: OscillatorType = "sine",
    volume = 0.2,
    delay = 0,
    music = false,
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.connect(g);
    g.connect(music ? this.musicBus! : this.effects!);
    o.start(now);
    o.stop(now + duration + 0.01);
  }
  noise(duration = 0.09, volume = 0.15, filter = 1200) {
    if (!this.ctx) return;
    const b = this.ctx.createBuffer(
        1,
        Math.ceil(this.ctx.sampleRate * duration),
        this.ctx.sampleRate,
      ),
      data = b.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
    const src = this.ctx.createBufferSource(),
      f = this.ctx.createBiquadFilter(),
      g = this.ctx.createGain();
    src.buffer = b;
    f.type = "lowpass";
    f.frequency.value = filter;
    g.gain.value = volume;
    src.connect(f);
    f.connect(g);
    g.connect(this.effects!);
    src.start();
  }
  play(name: string, tier = 1, options: SoundOptions = {}) {
    if (!this.ctx) return;
    if (this.sample(name, { ...options, tier })) return;
    if (name === "hit") {
      this.noise(0.05, 0.15, 900);
      this.note(160, 0.06, "sine", 0.1);
    } else if (name === "hurt") {
      this.note(110, 0.2, "sawtooth", 0.08);
      this.noise(0.12, 0.1, 500);
    } else if (name === "search") {
      this.noise(
        0.05,
        0.06 *
          1.3 *
          (["safe", "weapon", "bed"].includes(options.containerType ?? "")
            ? 1.2
            : 1),
        1800,
      );
    } else if (name === "loot") {
      if (tier < 3) this.note(tier === 1 ? 420 : 560, 0.12, "sine", 0.12);
      else {
        const notes =
          tier === 3
            ? [523, 659, 784]
            : tier === 4
              ? [587, 740, 880, 1174]
              : [523, 659, 784, 1046, 1318, 1568];
        notes.forEach((f, i) => this.note(f, 0.5, "sine", 0.216, i * 0.09));
      }
    } else if (name === "alert") {
      [0, 0.22, 0.44].forEach((t) => this.note(700, 0.14, "triangle", 0.16, t));
    } else if (name === "success") {
      [392, 523, 659, 784, 1046].forEach((f, i) =>
        this.note(f, 0.55, "sine", 0.2, i * 0.11),
      );
    } else if (name === "death") {
      [294, 247, 196, 147].forEach((f, i) =>
        this.note(f, 0.6, "triangle", 0.2, i * 0.15),
      );
    } else if (name === "click") this.note(460, 0.05, "sine", 0.08);
    else if (name === "heal") {
      [440, 660, 880].forEach((f, i) =>
        this.note(f, 0.2, "sine", 0.15, i * 0.1),
      );
    }
  }
}
