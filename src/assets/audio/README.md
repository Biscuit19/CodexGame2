# 当前本地音频

47个独立动作/枪械FLAC，以及10首音乐。音乐用单个HTMLAudioElement播放、接入原音量总线，不一次解码所有整曲。最新状态以[2026-10-23记录](../../../docs/AUDIO_RAID_MUSIC_DISCOVERY.md)和`approved-raid-audio.json`为准；此前未替换条目仍在actions/interactions/feedback/music元数据中。

基地原始配乐按原WebAudio score/note完整周期61.44秒导出，PCM母版在`original-score/`。`node scripts/assets/render-original-music.mjs /tmp/original-game-score`可复现；浏览器路径可用PLAYWRIGHT_CHROMIUM_EXECUTABLE配置。其余九首保持完整原文件。所有音乐固定匹配-24 LUFS，BGM总线另0.8。

1/2级原始提示同样导出并与其他发现匹配-30 LUFS，发现/解锁增益1.38。普通3/4/5级为D12-1/D3-2/D5-4；首次4/5级为D4-1/D5-2，互斥播放。首刀1.2；搜索1.3，safe/weapon/bed再1.2。枪声和其他未指定条目不变。

最新安装：`python scripts/assets/install-approved-raid-audio.py`。旧安装链会最后重新应用本轮选择，防止恢复旧发现与音乐表。无需改动用户原有音量滑块值。公开来源及逐音许可见public/audio-credits.html；不可把CC BY、CC BY-SA和FilmCow许可误称为CC0。

所有待选试听库（包括新40个交易/UI候选）排除在游戏离线预缓存之外。
