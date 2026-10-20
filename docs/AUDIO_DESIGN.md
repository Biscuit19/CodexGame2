# 三角猫行动：音效选型与接入

本轮目标：让四类武器可通过声音分辨，保留卡通战斗的力度，减少刺耳高频、夸张混响和电子玩具感。相同枪型使用同一声音模板；暂不制作高级武器专属音效。背景音乐、搜索、发现、受伤等未要求的声音保留原逻辑。以后新增或替换音效仍先联网比较免费素材、确认授权，再记录选择与备选。

本次通过公开仓库检索并下载了24个候选短音效，检查原作者授权说明，比较源文件类型、时长、瞬态、音量包络及处理后的峰值。下列声音定位是选材与混音设计目标，不是主观试听评分；最终听感可在游戏中继续调整。

## 来源与授权

| 来源 | 作者与授权 | 核对位置与采用范围 |
|---|---|---|
| [Warfork Free Soundpacks](https://github.com/TeamForbiddenLLC/warfork-free-soundpacks/tree/8005f47869cbac20608f1d606621e4b8fcdec574) | Caine、MaxCarnage／Team Forbidden LLC，CC0 1.0 | [原作者说明](https://github.com/TeamForbiddenLLC/warfork-free-soundpacks/blob/8005f47869cbac20608f1d606621e4b8fcdec574/README.md)。**仅采用`cc0/`目录**，不是官方商业音源；其他两个授权目录仅列为备选。 |
| [Kenney RPG Audio](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/f2b6264f9ab89fabc266914c3654685d68c5a39b/kenney_rpgaudio) | Kenney Vleugels，CC0，允许商业项目 | 镜像保留[原包License.txt](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/blob/f2b6264f9ab89fabc266914c3654685d68c5a39b/kenney_rpgaudio/License.txt)。采用金属、皮带、布料、刀具动作录音。 |
| [Kenney Impact Sounds](https://github.com/Boyquotes/kenney-impact-sounds-for-godot/tree/999dd1684873f8b020a3aa5b26e713da21688924) | Kenney，CC0 1.0 | [许可证](https://github.com/Boyquotes/kenney-impact-sounds-for-godot/blob/999dd1684873f8b020a3aa5b26e713da21688924/LICENSE)。采用轻金属与软质落地冲击。 |
| [Organic Wooshes](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/f2b6264f9ab89fabc266914c3654685d68c5a39b/Micro%20Pack%20-%20Organic%20Wooshes) | Ben Burnes／Abstraction，CC0 | [作者原包说明](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/blob/f2b6264f9ab89fabc266914c3654685d68c5a39b/Micro%20Pack%20-%20Organic%20Wooshes/_README.txt)明确允许增强、混音、再利用与任意用途。 |
| [The Motion Monkey Retro Arcade](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/f2b6264f9ab89fabc266914c3654685d68c5a39b/MMRetroArcadeSoundsPack1_0_5) | The Motion Monkey，原作者声明CC0 | [README](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/blob/f2b6264f9ab89fabc266914c3654685d68c5a39b/MMRetroArcadeSoundsPack1_0_5/README.txt)。下载Gun1、Gun5、Reload1比较，**本轮未采用**，复古定位更适合后续特殊武器。 |

来源网站Kenney和OpenGameArt的直连在当前环境被网络策略拒绝，因此使用带有原作者许可文件的公开镜像；未绕过网络限制。游戏运行时不会访问这些网站，也不会下载外站音效。

## 每类声音的选择与备选

表中“W-CC0”指上面的Warfork CC0目录；“W-SA”指同仓库`cc-by-sa-30-us`目录（免费但需署名和相同方式共享其音效衍生物）；“RPG”指Kenney RPG Audio；“Impact”指Kenney Impact Sounds；“Organic”指Ben Burnes；“Retro”指The Motion Monkey。具体采用文件、来源URL、固定版本与SHA-256全部记录在[src/assets/audio/sources.json](../src/assets/audio/sources.json)。备选不混入发布资源。

| 用途 | 本轮采用 | 免费备选 | 比较结论与设计处理 |
|---|---|---|---|
| 冲锋枪射击 | W-CC0 `machinegun_fire` | Retro `Gun1`；W-SA `machinegun_fire` | 采用0.318秒机枪原音，提音调、截短为约0.22秒，较低峰值，减少连射时的低频堆积；Retro偏复古，W-SA增加衍生授权维护。 |
| 步枪射击 | W-CC0 `machinegun_fire`＋Impact `impact_metal_light_000` | Retro `Gun5`；W-SA `machinegun_fire` | 同系列素材保持环境一致，但采用不同音高、滤波、0.36秒尾音与金属层；与冲锋枪的高短声音模板区别，绝非运行时共用同一音频。 |
| 狙击枪射击 | W-CC0 `instagun_strong`＋Organic `Thunk 1` | W-SA `instagun_strong`；Retro枪声组 | 原音0.921秒，削减高频和长尾，降低音调并叠少量低频实体冲击，成品约0.74秒；保留单发重量，避免过长竞技科幻尾音。 |
| 霰弹枪射击 | W-CC0 `riotgun_fire_strong`＋Organic `Thunk 1` | W-SA `riotgun_fire_strong`；Retro `Gun5` | 原音1.167秒，截短、降低音调并增加低频冲击，成品约0.68秒、四类中峰值最高；强调大口径近距离爆发。 |
| 冲锋枪换弹 | RPG `metalClick`、`handleSmallLeather`、`metalLatch` | Retro `Reload1`；RPG `drawKnife2`＋`metalClick` | 约1.7秒基准，轻巧短动作：释放、取弹匣、插入、拉机柄；Retro原音仅0.332秒，不足以自然覆盖完整装填。 |
| 步枪换弹 | RPG `metalLatch`、`cloth4`、`metalClick` | Impact轻／中金属＋RPG皮革；Retro `Reload1` | 约2.1秒，弹匣动作与最后枪栓分开；避免与冲锋枪机械节奏完全相同。 |
| 狙击枪换弹 | RPG `drawKnife2`、`metalLatch`、`handleSmallLeather`、`metalClick` | RPG `drawKnife1`＋Impact中金属；Retro `Reload1` | 约2.8秒，更稀疏、较沉的枪栓与弹匣动作，最后闭锁；不播放电子提示音。 |
| 霰弹枪换弹 | RPG `metalClick`、多次`metalLatch`、`drawKnife1` | Impact轻金属多次装填＋RPG拉动；Retro `Reload1` | 约2.8秒，逐发装填节奏后收束到上膛；现有玩法仍按整段时间换弹，不新增逐发装填机制。 |
| 装备／切换武器 | W-CC0 `weapon_switch`＋RPG `metalLatch` | RPG `drawKnife1/2`；Retro `Reload1`短切片 | 原切换声仅0.056秒，叠原始金属扣锁形成约0.34秒的拿起、锁定感；避免把全部装备都做成普通UI点击。 |
| 装备护具／背包 | RPG `clothBelt2`＋`beltHandle1` | RPG `handleSmallLeather`；RPG `dropLeather` | 约0.46秒，布料与皮带扣，区别枪械金属；不采用带魔法提示色彩的护甲拾取声。 |
| 翻滚 | Organic `Gentle Swish`＋RPG `cloth4`＋Impact `impact_soft_heavy_000` | Organic `Classic Swish 1`＋RPG `dropLeather`；RPG `cloth1`＋Impact软落地 | 气流、衣料、末端软着地，约0.35秒匹配翻滚动作；降低高频与落地冲击，不做卡通弹跳或电声滑动。 |
| 近战挥砍（解除与翻滚共用声音） | Organic `Slash` | W-CC0 `blade_strike1`；Organic `Classic Swish 1` | 用短促切风区分翻滚衣料声；不附加击中金属的声音，避免空挥也像打中了目标。 |

## 播放、时长与音量

- 同一枪型共用同一处理后的样本。后续特殊高级武器可在枪型默认表之前增加武器ID覆盖，不必改掉当前分类。
- 敌人枪声和换弹与玩家使用相同音源，源增益分别为0.75和1，明确是音量增益降低25%，不是降低25分贝。
- 换弹使用`AudioBuffer.duration / 武器reload秒数`设置播放倍速，完整机械序列与当前武器换弹条同步。例如基准1.7秒的冲锋枪序列，1.5秒换弹会相应加速；2.3秒则放慢。倍速也会轻微改变音高，符合本轮要求，未加入拉伸算法。
- 切枪、更换弹药、结束换弹、退出本局会终止原玩家换弹声；异步解码结束后也不会补播已取消的换弹。样本预加载、缓存解码，高频连射可重叠，上限40个样本声部防止无界增长。
- 读取或解码失败不阻塞菜单和战斗，记录警告；不偷偷改回原合成枪声。无远程音频依赖，所有12个成品OGG参与构建和离线缓存。
- 成品单声道44.1kHz，总量约156KiB。离线处理削减高频、加极短淡入淡出、温和压缩。解码检查峰值均小于1，四类成品射击峰值约0.60、0.74、0.83、0.90；霰弹枪更重、冲锋枪更轻。

## 参数显示

“散布”是实际射击算法的完整左右扇区角度：`2 × spread × 180/π`，霰弹枪把原有末端弹丸随机抖动一并计入最大角度。卷尾猫兹显示13.8°（左右各约6.9°）；狙击枪0°；抓板870约20.9°。不改变弹道。

近战描述显示伤害48、攻速2.22次／秒，与实际0.45秒冷却共用常量，不再依赖旧的120发／分描述值。

## 复现与后续工作

```sh
python scripts/assets/build-game-audio.py --source-dir /tmp/tricat-audio-sources
```

依赖Python标准库与ffmpeg。固定来源版本、处理参数及SHA-256见同目录`sources.json`；授权原文随[src/assets/audio/licenses](../src/assets/audio/licenses)提供。后续替换音效应继续沿用“检索多个候选→核对原作者许可→比较→记录选择及备选→本地打包→相关验证”的流程。
