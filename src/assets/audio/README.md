# 游戏当前本地音频

43个独立动作/枪械FLAC与4首完整音乐，均本地打包，运行时不访问作者站点。动作按需解码；音乐通过单个HTMLAudioElement流式播放并接入现有音量总线，避免一次解码所有整曲。

| 当前组成 | 文件数 | 元数据 |
| --- | --- | --- |
| 保留枪械（除新步枪外） | 4 | sources.json / AUDIO_SELECTED.md |
| 已定动作/食物 | 9 | approved-actions.json |
| 已定交互/开盖 | 17 | approved-interactions.json |
| 已定换弹/猫叫/入包/三级五级发现 | 11 | approved-feedback.json |
| 新步枪SM1、四级发现D3-4 | 2 | approved-music.json |
| BG3/BG5/BG6/BG10完整音乐 | 4 | approved-music.json / src/music.ts |

最新行为及许可见[采用记录](../../../docs/AUDIO_APPROVED_MUSIC.md)；公开署名在public/audio-credits.html。动作基线约-30 LUFS，音乐播放约-24 LUFS；固定增益，不使用动态压缩来凑仪表。音乐文件与原件哈希相同。

整体主增益1.3，枪声单独0.7，敌人枪声为玩家50%，发现额外1.2。默认蓝莓循环，可设置四首随机。详细许可保留CC0、CC BY3/4、CC BY-SA3和FilmCow自定义许可，不能统一称为CC0。

运行`python scripts/assets/install-approved-music.py`复现最新采用；旧动作/交互/枪械构建链最后也会应用最新选择。未选试听库不进入游戏离线预缓存。
