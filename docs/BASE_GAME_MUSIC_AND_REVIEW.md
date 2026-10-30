# 基地／游戏音乐分开与20首静谧候选（2026-10-30）

试听地址：[/audio-review/peaceful-music/index.html](https://biscuit19.github.io/CodexGame2/audio-review/peaceful-music/index.html)。旧试听首页、此前两轮音乐页与调音台增加入口。

## 游戏设置

- 基地音乐：暖窝基地原始配乐，保留单曲循环。
- 游戏音乐：现有九首战区曲目，保留原选择与单曲循环／随机播放；原始基地曲移出该列表及随机池。
- 基地音乐音量与游戏音乐音量独立。基地／战区切换时，使用各自的曲目和音量；每次回基地恢复暖窝基地。
- 旧存档缺少基地音量时继承该存档的原音乐音量，不反复覆盖个人设置。旧存档若曾在战区选择原始基地曲，迁移为游戏默认BG5；其他已选游戏曲不变。
- 新试听候选**仅在试听站**，不提前加入任何游戏曲目列表。
- 调音台及统一调整台同步增加基地音乐音量，导出的`preview.settings.baseMusic`可独立应用；旧三滑块JSON解析时继承原music。保留现有其余音量和publishedFromExport，避免仅改结构就强制重置个人音量。
- 调音台仍可试听原始配乐：内部明确开启预览模式，选择暖窝基地时使用基地音量；该预览权限不扩展实际游戏随机池。

## 新选材

20首新曲来自15位作者；对照过此前20首音乐来源，未重复曲目。比较优先考虑柔和旋律、留白、钢琴／竖琴／木吉他和轻环境质感。短循环、略带节奏或怀旧情绪的差异在卡片单列，供玩家自行比较，不强行宣称所有作品听感相同。

检索来自OpenGameArt的calm、peaceful、gentle等排序结果，并拓展Kevin MacLeod、Scott Buckley、Chris Zabriskie官方发行站与官方播放器文件。核对了作者、具体曲目、许可、公开收藏/下载及听众评论；没有单曲统计的官方曲库如实标注，不将作者知名度或平台流量当成单曲热度。原页公开统计记录在清单的evidence字段；不是全网使用次数。

| 编号 | 曲目与作者 | 完整时长 | 风格／对比理由 | 原始发行与授权 |
| --- | --- | ---: | --- | --- |
| PM01 | 雪乡小镇 · Snowland Town — Matthew Pablo | 2:06 | 柔和钢琴与弦乐；作者标注 calm、peaceful、delicate，优先比较温柔的村庄感。 | [原页](https://opengameart.org/content/snowland-town) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM02 | 快乐摇篮曲 · Happy Lullaby (song17) — The Cynic Project (cynicmusic) | 0:40 | 轻铃声与琶音；旋律清亮但节奏平稳；相比纯钢琴更有轻盈感。 | [原页](https://opengameart.org/content/happy-lullaby-song17) · [CC0-1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| PM03 | 林间幻想 · Woodland Fantasy — Matthew Pablo | 2:30 | 木吉他、长笛与弦乐；乡野与木质乐器方向，旋律比环境音乐更明确。 | [原页](https://opengameart.org/content/woodland-fantasy) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM04 | 又一个八月 · Another August — The Cynic Project (cynicmusic) | 3:27 | 舒缓环境与钢琴；作者标注 serene、ethereal、calm；更偏安静探索。 | [原页](https://opengameart.org/content/another-august) · [CC0-1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| PM05 | 蓝帽花 · Bluebonnet — Kistol | 2:07 | 柔和钢琴；作者标注 soft、relaxing、gentle，适合先试听的基地候选。 | [原页](https://opengameart.org/content/bluebonnet) · [CC0-1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| PM06 | 勿忘我 · Forget Me Not — Kistol | 3:09 | 怀旧钢琴；比明亮小镇音乐更内敛，带少量怀旧情绪。 | [原页](https://opengameart.org/content/forget-me-not) · [CC0-1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| PM07 | 平和片刻 · Peaceful Scene — Peter Eastman | 1:18 | 竖琴与小提琴；安全休息场景的短完整作品，不截取。 | [原页](https://opengameart.org/content/peaceful-scene) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM08 | 水晶洞穴 · Crystal Caves — FoxSynergy | 4:00 | 轻长笛与颤音琴；选择作者推荐完整v1.2；带轻微16位音色。 | [原页](https://opengameart.org/content/crystal-caves) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM09 | 亲爱的日记 · Melodic & gentle ambient music — PetterTheSturgeon | 3:27 | 钢琴、木琴与环境弦乐；柔和、留白较多，略有神秘感，作为不同质感备选。 | [原页](https://opengameart.org/content/melodic-gentle-ambient-music) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM10 | 夜晚小镇 · Fantasy Music - Night Town — Angus Macnaughton | 4:12 | 轻竖琴与凯尔特氛围；作者说明为安静夜间城镇创作，温柔中略带感伤。 | [原页](https://opengameart.org/content/fantasy-music-night-town) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM11 | 水晶草甸 · Crystal Meadow — joeBaxterWebb | 4:16 | 轻竖琴环境；作者描述为空气感环境底色和缓缓推进的竖琴。 | [原页](https://opengameart.org/content/crystal-meadow) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM12 | 五月凌晨一点 · Peaceful 1am in May — TAD | 3:52 | 轻Lo-fi与复古音色；本组少量有轻拍的对照；不属于纯钢琴，便于比较。 | [原页](https://opengameart.org/content/peaceful-1am-in-may) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM13 | 细微流动 · Tiny Movement — Scott Clarke | 2:09 | 极简钢琴环境；较新、热度较低的风格补充，不冒充热门单曲。 | [原页](https://opengameart.org/content/tiny-movement) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM14 | 银河静殿 · Galactic Temple — yd | 2:53 | 宁静环境合成器；环境底色比钢琴更悬浮，原页听众反馈适合安静时聆听；作为轻环境方向比较。 | [原页](https://opengameart.org/content/galactic-temple) · [CC0-1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| PM15 | 平和序曲 · Peaceful Intro (Looping) — Eric Matyas | 0:24 | 极轻钢琴循环；完整原曲约24秒，是短循环候选；适合标题或基地，不假称长曲。 | [原页](https://opengameart.org/content/peaceful-intro-looping) · [CC-BY-3.0](http://creativecommons.org/licenses/by/3.0/) |
| PM16 | 静思即兴曲02 · Meditation Impromptu 02 — Kevin MacLeod | 4:09 | 柔软钢琴；作者明确说明为冥想创作，没有突兀段落，只有轻柔流动旋律。 | [原页](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100162) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM17 | 清澈灵魂 · Clean Soul — Kevin MacLeod | 5:07 | 极简电钢琴与贝斯；作者说明是干净、柔软、留白很多的作品。 | [原页](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300033) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM18 | 静静遐想 · Reverie — Scott Buckley | 3:44 | 梦境钢琴、合成器与弦乐；亲密、梦境般的作品；比独奏钢琴更有空间感。 | [原页](https://www.scottbuckley.com.au/library/reverie/) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM19 | 前奏曲一 · Prelude No. 1 — Chris Zabriskie | 1:09 | 短篇独奏钢琴；完整约69秒的独奏作品，不裁切；偏简洁内敛。 | [原页](https://chriszabriskie.com/preludes/) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |
| PM20 | 前奏曲二十三 · Prelude No. 23 — Chris Zabriskie | 1:44 | 短篇独奏钢琴；原站播放器使用的完整文件，实际约104秒；与前奏曲一分开比较，不裁切。 | [原页](https://chriszabriskie.com/preludes/) · [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) |

## 文件、署名与重建

- 完整原始文件逐字节保留；Snowland Town和Galactic Temple从作者压缩包提取完整MP3／OGG。其他MP3、OGG、M4A直接取自原页或官方播放器。没有截取、拼接、变调、滤波、淡入淡出或动态压缩。
- FFmpeg只用于解码校验、时长及响度测量；试听通过Web Audio固定播放增益匹配约-24 LUFS，并限制预测真峰值不超过-1 dB。原始文件不改写。
- 暖窝基地另提供原始参考曲，不计入20首。
- PM20官方网页列出的时长与其播放器实际文件不一致；采用该播放器的完整文件，并显示实际解码时长约104秒，不剪成网页标记的53秒。
- 来源、文件URL、压缩包条目、完整SHA256、时长、作者、许可、匹配增益固定在`scripts/assets/peaceful-music-sources.json`及试听目录`manifest.json`。
- 重建：`python3 scripts/assets/build-peaceful-music-review.py`。需要curl、FFmpeg，下载缓存为`/tmp/tricat-peaceful-music`；已记录文件哈希不符则拒绝。
- 每首卡片提供原页和许可，页面保留作者及专辑名；授权原文另存试听目录licenses，署名表见同目录NOTICE.md。CC-BY 3.0/4.0允许商业使用及游戏分发，需署名和提供许可链接；CC0可自由使用。

## 试听与验证

- 原生进度条支持完整播放／拖动，每首可循环。默认音量100%，切换曲目停止其他声音。
- 每首分别选择“基地用”“游戏用”，可同时选择两边；复制生成明确分组文字，也可导出含北京时间戳和来源哈希的选择JSON。
- 选择只存试听页面自身草稿，不写游戏存档。20首候选及参考资源不进入游戏离线预缓存，不增加普通玩家的开局下载。
- 单元验证设置迁移、许可和文件哈希、独立调音JSON、调整台；Chrome验证实际基地／战区音量与曲目、随机池、真实撤离回基地、页面原曲播放、选择、复制、时间戳导出。仅做相关测试。
