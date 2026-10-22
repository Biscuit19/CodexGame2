# 已采用：换弹、猫叫、发现与入包（2026-10-22）

本记录覆盖此前采用记录的对应条目。四类枪声与霰弹枪换弹保持原文件，其余动作保持已确认选择。新枪声/BGM只在[新试听页](AUDIO_SHOTS_MUSIC_REVIEW.md)待选。

| 游戏声音 | 最终选择 | 时长 | 来源与许可 |
| --- | --- | --- | --- |
| reload-smg | NR1 | 1.895秒 | [OpenSoldat base contributors（原页未逐条列录音作者）](https://github.com/opensoldat/base/tree/5b6e5bef23f5c0d58fb1d4d887b9b94ebcf799b4) · CC-BY-4.0 |
| reload-rifle | NR3 | 1.997秒 | [OpenSoldat base contributors（原页未逐条列录音作者）](https://github.com/opensoldat/base/tree/5b6e5bef23f5c0d58fb1d4d887b9b94ebcf799b4) · CC-BY-4.0 |
| reload-sniper | NR2 | 2.561秒 | [OpenSoldat base contributors（原页未逐条列录音作者）](https://github.com/opensoldat/base/tree/5b6e5bef23f5c0d58fb1d4d887b9b94ebcf799b4) · CC-BY-4.0 |
| hurt | PH10 | 0.516秒 | [IgnasD](https://opengameart.org/content/meow) · CC0-1.0 |
| enemy-alert-1 | EA5 | 1.260秒 | [Joseph SARDIN](https://bigsoundbank.com/growling-cat-2-s1886.html) · CC0-1.0 |
| enemy-alert-2 | EA6 | 1.260秒 | [Joseph SARDIN](https://bigsoundbank.com/growling-cat-3-s1887.html) · CC0-1.0 |
| enemy-alert-3 | EA7 | 1.260秒 | [Joseph SARDIN](https://bigsoundbank.com/growling-cat-4-s1888.html) · CC0-1.0 |
| enemy-alert-4 | EA10 | 1.260秒 | [Joseph SARDIN](https://bigsoundbank.com/cat-complaining-s0658.html) · CC0-1.0 |
| pack | D12-3 | 0.148秒 | [Little Robot Sound Factory](https://opengameart.org/content/fantasy-sound-effects-library) · CC-BY-3.0 |
| discover-3 | D3-2 | 2.354秒 | [ViRiX Dreamcore / soundcloud.com/virix](https://opengameart.org/content/ui-and-item-sound-effect-jingles-sample-2) · CC-BY-3.0 |
| discover-4 | D4-1 | 3.573秒 | [Little Robot Sound Factory](https://opengameart.org/content/fantasy-sound-effects-library) · CC-BY-3.0 |
| discover-5 | D5-2 | 5.942秒 | [Little Robot Sound Factory](https://opengameart.org/content/sci-fi-sound-effects-library) · CC-BY-3.0 |

采用文件以约-30 LUFS动作基线固定增益匹配，不额外拼接、滤波、压缩或改变猫叫音高。换弹播放速度继续随实际武器换弹耗时同步。来源、每段边界、原件和输出哈希见 `src/assets/audio/approved-feedback.json`，公开署名见游戏“音效来源与许可”。

发现1–5级在现有基础上增益×1.2；1–2级保留旧合成发现声。敌人射击是玩家同枪型增益的50%，敌人换弹仍为75%。受击猫叫在匹配基线上再以50%播放，敌人警戒为65%，避免压过普通音效。

PH10是唯一玩家受击叫声。敌人警戒在EA5/6/7/10间随机；进入发现状态才触发，持续追击不逐帧重复，炮塔不猫叫。猫叫使用独立随机源，不消耗地图/掉落随机序列。受击至少间隔0.35秒、警戒至少0.7秒，同类单声并发，避免多敌堆叠过响。

保险箱在本局第一次打开时保存完整题目、答案和选项顺序。关闭、答错、冷却再打开都复用同一对象；其他箱子和下一局仍独立出题。不增加永久坐标题库。

复现：`python scripts/assets/install-approved-feedback.py`。旧动作/交互/枪械构建器最后重新应用本记录，防止重建后恢复旧选择。当前43个独立FLAC，按需加载，不依赖作者站点运行。

专项验证：9项相关单元测试及Chrome实际音频解码/增益/换弹取消、保险箱关闭和答错后重开测试通过。新试听页另2项Chrome专项测试通过。不重复地图全量回归。
