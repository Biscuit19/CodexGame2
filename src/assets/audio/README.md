# 游戏当前本地音效

- **8 个 FLAC**：已按用户选择接入的四类单发枪声与换弹，使用无损打包，解码采样与当前试听 WAV 完全相同。来源为 SnakeF8（CC0）及 Mike Koenig / SoundBible.com（CC BY 3.0），不是全部 CC0。
- **4 个 OGG**：装备武器、装备护具、翻滚、挥刀，保留原文件，未随本轮更换。原来源为 Warfork 的 CC0 部分、Kenney、Ben Burnes，详见 [foley-sources.json](foley-sources.json) 和 [licenses](licenses)。

当前枪械清单、处理及 SHA-256：[sources.json](sources.json)。裁剪、拼接、轻微高频柔化和换弹时长约定：[制作说明](../../../docs/AUDIO_SELECTED.md)。游戏设置页提供“音效来源与许可”，公开署名页为 [audio-credits.html](../../../public/audio-credits.html)。

Mike Koenig 的原音：

- [416 Barrett Sniper 3x](https://soundbible.com/1880-416-Barrett-Sniper-3x.html)，最后一次射击至结尾。
- [10 Guage Shotgun](https://soundbible.com/1262-10-Guage-Shotgun.html)，轻微柔化高频并统一音量。
- [Eject Clip And Re-Load](https://soundbible.com/414-Eject-Clip-And-Re-Load.html)，前 1.8 秒，与 SnakeF8 泵动声顺序拼接。

以上按 [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)使用；保留作者署名、原页和许可链接，并注明剪切、音量、拼接与 EQ 修改。CC0 原音见 [SnakeF8 第一包](https://f8studios.itch.io/snakes-authentic-gun-sounds)、[第二包](https://f8studios.itch.io/snakes-second-authentic-gun-sounds-pack)。不将这些录音误标为本项目原创。

复现：`python scripts/assets/build-game-audio.py`，或 `python scripts/assets/build-selected-audio.py --install-game`。只读取仓库中的固定原始候选，生成当前已批准的枪声和换弹；四个保留动作文件只校验、不重写。旧版被用户否决的枪声合成配方仅留在 Git 历史，不再是当前生成入口。
