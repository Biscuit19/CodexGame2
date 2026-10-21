# 游戏当前本地音效

- 8 个枪声/换弹 FLAC：SnakeF8（CC0）与 Mike Koenig（CC BY 3.0），保留已定声音。
- 10 个动作/食物 FLAC：用户选择的 T4、W4、A3、S4、L4、D5、C1、F1；F1 同时对应薯四和快乐餐盒。依据 [采用记录](../../../docs/AUDIO_APPROVED_ACTIONS.md)，整体固定响度匹配到约 -30 LUFS，保留组件间匹配与弱恢复点缀，不做动态处理。
- 1 个挥刀 OGG：Ben Burnes / Abstraction（CC0），暂时保留，等待新候选选择。

原枪声清单：[sources.json](sources.json)。已采用动作的精确输入哈希、剪切、组件增益和成品测量：[approved-actions.json](approved-actions.json)。旧挥刀元数据：[foley-sources.json](foley-sources.json)。公开署名：[audio-credits.html](../../../public/audio-credits.html)。许可并非全部 CC0，包含 CC BY 3.0、Gary 的 CC BY-SA 3.0 及 FilmCow 自定义免版税许可。

复现枪声：`python scripts/assets/build-game-audio.py`。复现已采用动作：`python scripts/assets/install-approved-actions.py`。两者保留对方的已定音源。新试听候选不自动接入游戏。
