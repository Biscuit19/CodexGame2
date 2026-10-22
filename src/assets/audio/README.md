# 游戏当前本地音效

共43个独立本地音源，按需解码后播放，游戏运行时不访问原作者站点。

- 5个保留枪械FLAC：四类射击与霰弹枪换弹保持不变，见 [枪械记录](../../../docs/AUDIO_SELECTED.md)。
- 9个此前选择继续使用的动作/食物FLAC：T4、W4、A3、S4、L4两个时长、D5两个时长、C1，见 `approved-actions.json`。
- 17个保留交互FLAC（四个发现/入包文件已由下项替代）：两刀、切刀、12类开盖（普通/Boss盒共用BL2）、纯脆嚼、三秒四级进食，见 [交互采用记录](../../../docs/AUDIO_APPROVED_INTERACTIONS.md) 和 `approved-interactions.json`。

音量以约-30 LUFS动作基线匹配，保留各声音自然动态。未为凑仪表使用压缩/限幅；短于400毫秒的声音仅在测量阶段补静音，输出长度保持原值。两种四级食物声音与动作均为3秒；KN3切刀加速至0.3秒。当前切枪明确使用W4，最新用户选择取代之前安静切枪的约定。

公开署名见 `public/audio-credits.html`。CC0、CC BY3.0、CC BY-SA3.0和FilmCow自定义许可按每条元数据保留，不统一误标CC0。`sources.json`汇总当前状态；旧`foley-sources.json`已空置并标明被替代。

复现：`python scripts/assets/install-approved-actions.py` 会在旧动作之后应用最新交互选择；只重建最新交互可用 `python scripts/assets/install-approved-interactions.py`。枪械构建器保留已确认的动作和交互音频，不恢复被淘汰的包装声与旧挥刀。

新40个换弹/循环搜索/玩家受击/敌人警戒候选尚未接入，也不会预缓存给普通玩家，见 [待选研究](../../../docs/AUDIO_RELOAD_SEARCH_CATS.md)。

- 12个最新采用FLAC：NR1/NR3/NR2、PH10、EA5/6/7/10、D12-3、D3-2/D4-1/D5-2，见[最新采用记录](../../../docs/AUDIO_APPROVED_FEEDBACK.md)。旧构建脚本会最后调用`install-approved-feedback.py`，保留最新结果。

上述40候选中用户指定部分现已采用；其余仍待选。新30枪声/音乐候选未采用、不进入游戏预缓存。
