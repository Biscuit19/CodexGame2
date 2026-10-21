# 用户已选枪械音效：制作与连发试听

试听：https://biscuit19.github.io/CodexGame2/audio-review/selected/index.html

本轮按 2026-10-21 用户选择制作网页，**没有接入游戏，也没有修改翻滚、装备武器、装备护具声音**。保留[原素材试听页](https://biscuit19.github.io/CodexGame2/audio-review/)供对照。

## 精确选择与制作

| 枪型 | 单发来源 | 换弹来源与顺序 |
|---|---|---|
| 冲锋枪 | E `9mm 单发｜轻型枪声候选`，完整单发 | E `AR 完整换弹` |
| 步枪 | E `7.62×54R 单发｜栓动步枪`，完整单发 | E `AR 完整换弹`，与冲锋枪一致 |
| 狙击枪 | G `.416 Barrett 狙击枪｜三次射击`，从约 2.03s 起截取最后一次击发至原文件结尾。第三次击发起音约 2.05s，保留约 20ms 起音前间隙及全部弹壳尾声 | E `.308 栓动完整换弹` **播完后接** H `Mossberg 590 泵动霰弹枪换弹` |
| 霰弹枪 | G `10 Gauge 霰弹枪｜立体声`，完整单发 | G `退出弹匣并换弹｜Eject Clip And Re-Load` **精确前 1.8s**，播完后接 E `泵动霰弹枪完整换弹` |

“后加／加上”按前后顺序拼接，不同时叠在一起。没有跨段重叠、交叉淡化或人工插入间隔。

## 只调整音量、剪切与拼接

- 不加 EQ/滤波、变调、时间拉伸、混响、淡入淡出、动态压缩、限幅或合成声。换弹按制作后实际时长播放，不按游戏速度倍速。
- 两种组合各自先匹配两段 **BS.1770 / EBU R128 综合响度**，只给每段一个固定线性增益，再依次拼接。
- 拼接后再对四类枪声、四类换弹统一固定增益。八个输出均为 **−28.4 LUFS**（分析精度 0.1 LU），成品真峰值不高于 **−1 dBTP**。综合响度相同并不要求自然瞬态峰值相同。
- 共同目标由原录音可用峰值余量决定：G 换弹前 1.8s 动态范围较大，不能为了拉响而把它削波。选择所有声音都能仅用线性音量实现的共同目标，不使用压缩或限制峰值的效果。
- 狙击换弹的两段先匹配至 −21.7 LUFS；霰弹换弹的两段先匹配至 −28.3 LUFS。每段原始/匹配后响度、固定增益、拼接偏移和最终响度均在清单记录。
- 输出 24-bit PCM WAV，避免再次 MP3 有损编码。共同格式为 44.1kHz、立体声；仅 H 原本为 48kHz，拼接时做必要采样率统一，保留时长、音高及节奏。这是格式对齐，不增加音色效果。
- 播放器默认 **100%**，不再额外默认降低试听音量。

## 连发试听

选择枪型、射速（30–1200 发/分）及发数（3/5/10/20）。默认射速采用现有游戏代表值：冲锋枪 720、步枪 600、狙击枪 45、霰弹枪 70 发/分，仅作为试听初值。

每发都重复对应**同一段用户选定的单发 PCM**，按照 `60 / RPM` 秒间隔放置，完整保留每发尾音，不用原素材里的连发样本替代、不截断上一发，也不变调。实际相邻偏移按采样点取整；最终长度包括最后一发的完整尾音。

自然重叠可能增加音量。如果总波形的采样峰值超过 −1dBFS，则对整个连发缓冲区使用一个固定衰减系数，不逐帧改变音量，**不是动态压缩器/限幅器**。这保证高射速下不因简单相加而破音。参数改变、开始单发/换弹、停止全部及隐藏页面均停止当前连发；音量旋钮同时作用于单发、换弹和连发，不改存档。

## 授权与原音溯源

| 制作者 | 本轮使用 | 授权与原发行页 |
|---|---|---|
| SnakeF8 | E 9mm、7.62×54R、AR 换弹、.308 换弹、泵动换弹 | 发行页允许商用，作者确认 public domain / CC0；[第一包](https://f8studios.itch.io/snakes-authentic-gun-sounds)、[第二包](https://f8studios.itch.io/snakes-second-authentic-gun-sounds-pack) |
| Mike Koenig / SoundBible.com | G .416、10 Gauge、退出弹匣并换弹 | CC BY 3.0；[.416 原页](https://soundbible.com/1880-416-Barrett-Sniper-3x.html)、[10 Gauge 原页](https://soundbible.com/1262-10-Guage-Shotgun.html)、[换弹原页](https://soundbible.com/414-Eject-Clip-And-Re-Load.html) |
| RA The Sun God / SoundBible.com | H Mossberg 590 换弹 | CC BY 3.0；[原页](https://soundbible.com/1959-Shotgun-Reload-Pump.html) |

裁剪、固定音量调整与拼接由本项目按用户指定完成；不声称创作或录制原声音。CC BY 3.0：https://creativecommons.org/licenses/by/3.0/ 。完整原素材署名与许可仍见[署名文件](../public/audio-review/licenses/ATTRIBUTION.md)。本页清单继续链接每条原作者条目、原音相对地址及 SHA-256。

## 复现与验证

```sh
python scripts/assets/build-selected-audio.py
```

只需要现有 `public/audio-review/audio` 中九条原始候选和 ffmpeg/ffprobe。脚本先验证原音 SHA-256，裁剪、测量匹配、拼接、归一化，输出 `public/audio-review/selected` 下的八条 WAV 和 [manifest.json](../public/audio-review/selected/manifest.json)。文件名含内容哈希；原素材文件和游戏音效不变。

测量过程使用浮点音频，不在分析前截断原 MP3 解码可能存在的超额峰值；只有最终音量处理后才导出 PCM24。脚本断言八条输出响度差不超过 0.15 LU、真峰值不超指定上限。

浏览器只测相关内容：Chrome 八条文件真实解码、最高默认音量、单发/换弹与连发互斥、正确发数与射速/完整尾音、停止、音量、非法射速、重叠峰值的固定整体衰减、手机布局及 WAV 下载。不执行战斗或地图全量测试。
