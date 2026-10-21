# 搜索、容器与四级食物音效候选

试听地址：https://biscuit19.github.io/CodexGame2/audio-review/interactions/index.html

已确认的 T4 / W4 / A3 / S4 / L4 / D5 / C1 / F1 已接入游戏，见 [采用记录](AUDIO_APPROVED_ACTIONS.md)。本页 **23 类 × 5 个 = 115 个新候选全部待选择**，未替换枪声、换弹、挥刀、容器、搜索、发现、装包与四级食物的现用声音。两种四级食物时长共带来 120 个试听版本，另有 100 个完整原声参考；原声和候选均按需加载，不进入游戏离线预缓存。

## 使用与试听

- 初始音量 100%；单条、同类五条连听、停止、完整原声与来源展开、按类选择、复制清单均保留。选择仅在页面内存，不写游戏存档，离开前复制。
- 吃饭和短嗝分别选择。组合按钮把已选短嗝放在吃饭末尾预留的 0.5 秒内；海鲜拼盘 1.2 秒、鱼面 2.4 秒。未选时用第一候选，时长版本可分别选择。
- 挥刀组合按游戏现用 0.45 秒间隔连挥五次。单条只取不超过 0.4 秒的挥动段，不把命中重物当作空挥。
- 搜索可按 2/4/6 秒循环，再接已选等级的发现声与装包声。四档发现还可依次比较：1–2级共用、珍贵、稀世、传说。循环只是试听演示，不是已安装的搜索逻辑。
- 换弹提供原速及 1.5/2.5/3.5 秒同步试听；同步通过播放速度完成，下载素材本身不拉伸。原素材保留末段机械动作，不重新用真实枪械现场录音凑换弹。

## 选材与比较

先参考开发者社区的声音素材推荐，再访问原作者发行页核对实际内容和分发授权。上一轮推荐证据与访问限制见 [此前研究](AUDIO_ACTION_REVIEW.md)。本轮追加了多位开发者的开放游戏成品、金属/纸/布 Foley 和奖励提示包；主体有具体下载/收藏或开发者使用反馈，个别极匹配动作作为补充，**不声称每条都热门**。下载量不能换算为游戏采用数。

本轮 Brave 完成一次换弹检索后返回 429/验证页，停止继续请求；itch 多标签榜单返回 403，但正常原作者页面可访问。没有绕过验证，也没有只在 GitHub 搜索素材。开放游戏仓库只用于核验公开作品的原始来源、用途与许可。

| 比较方向 | 处理与取舍 |
| --- | --- |
| 游戏换弹与实枪录音 | Red Eclipse 包内 package.cfg 明确登记 reload，保留开发者制作的成品机械节奏；StarNinjas 是以门部件为游戏设计的声音。后者热度偏低，透明列为风格补充。五条来自两个作者团队，并非五位作者。 |
| 轻短嗝 | 五个独立录音由 Axeline T. 表演、Joseph SARDIN 录制，原页称女人轻轻打嗝，并非婴儿。按较短、自然的方向选，不变调、不做共振夸大；是否足够可爱由试听决定。没有把同一段变调成五个。 |
| 四级食物 | 真实猫咪进食、自然细嚼、脆嚼几种方向比较；两种食物统一吃饭＋轻嗝，不继续强制吸面与粗豪男嗝。吃和嗝独立选择，声音不硬拼为不可换的版本。 |
| 容器 | 按模型材质选纸板/草叶/金属盒/塑料盖/滑轨/拉链/软布。少数材质类比在卡片如实注明，例如干叶脚步取叶声、微波炉门取塑料扣；不冒充容器实录。每种现有容器均有五条。 |
| 搜索与发现 | 持续搜索用拿动、翻找和摩擦；发现用作者已完成的确认、升调和奖励声。参考鸭科夫/三角洲的过程与反馈分层，不提取商业游戏声音，不宣称还原它们的原声。 |
| 稀有度奖励 | 使用原作者完整乐句/自然尾声，级别提升靠展开、旋律和完成感，而不是简单变响。有的传说候选较长，供比较，尚未确定接入时长。 |
| 原音量与处理 | 各组件先固定增益匹配，再对候选整体匹配；短嗝在统一基线上另降到70%，避免压过吃饭。剪切边缘4毫秒防咔哒。无变调、EQ、混响、压缩、限幅或自创旋律。完整参考转无损FLAC，必要时仅固定防削波衰减。 |

### 热门但没有独立托管的备选

| 官方素材 | 证据与排除原因 |
| --- | --- |
| [Shapeforms Audio Free SFX](https://shapeforms.itch.io/shapeforms-audio-free-sfx) | 4.9/5、67评分，评论有真实游戏采用；禁止声音独立分发或公开声音源码仓库再分发，因此只保留官方页，不把其文件放本试听站。 |
| [TomMusic Free Fantasy](https://tommusic.itch.io/free-fantasy-200-sfx-pack) | 5/5、34评分，有使用反馈；不允许独立分发，未托管。 |
| [Leohpaz RPG Essentials](https://leohpaz.itch.io/rpg-essentials-sfx-free) | 5/5、27评分；独立分发受限且偏retro，未强行为凑数托管。 |
| [Sonniss GDC](https://sonniss.com/gameaudiogdc/) | 开发者经常推荐，但限制声音独立分发；不放到本公开逐条试听页。 |
| OpenSpades | 核验官方资源位置与声明；包中有禁止独立分发的 Nonfree 音源，不纳入。 |

## 来源、作者、热度与授权

以下数字为 2026-10-21 核验快照，含前轮已核验并继续使用的材料。BigSoundBank 的短嗝等具体动作没有公开下载数，明确标为补充。同一作者的五次轻嗝集中在一个类别；整批来源覆盖 22 个作者/团队标识，未将一位作者的多个包当作多位作者。

| 素材 / 作者 | 核验依据 | 授权 |
| --- | --- | --- |
| [FilmCow Recorded SFX](https://filmcow.itch.io/filmcow-sfx) / Jason Steele / FilmCow | 4.9/5，134 条评分；本次 itch.io 免费音效热门页第 3；评论含多款已发布游戏链接。 | FilmCow Royalty Free SFX License |
| [202 More Sound Effects](https://opengameart.org/content/202-more-sound-effects) / OwlishMedia | 5,353 次下载，49 收藏；包含录制的饮水、布料、魔术贴，评论有使用作品。 | CC0-1.0 |
| [RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) / artisticdude | 65,122 次下载，410 收藏；原用于 Summoning Wars / FLARE，评论有实际采用反馈。 | CC0-1.0 |
| [Inventory Sound Effects](https://opengameart.org/content/inventory-sound-effects) / artisticdude（Ogrebane 发布） | 15,434 次下载，156 收藏；为 Summoning Wars 制作，OSARE/FLARE 开发者在原页说明使用。 | CC-BY-3.0 |
| [7 Eating Crunches](https://opengameart.org/content/7-eating-crunches) / Tito / StarNinjas | 2,530 次下载，15 收藏；有猫咪进食游戏 Feeding Nekotan 的实际使用反馈。 | CC0-1.0 |
| [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) / rubberduck | 7,024 下载，39 收藏，有游戏采用反馈。 | CC0-1.0 |
| [100 Metal and Wood SFX](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) / rubberduck | 3,883 下载，23 收藏；含金属开门、锁与木材移动。 | CC0-1.0 |
| [80 CC0 RPG SFX](https://opengameart.org/content/80-cc0-rpg-sfx) / rubberduck | 9,611 下载，84 收藏；有游戏使用反馈。 | CC0-1.0 |
| [Fantasy Sound Effects Library](https://opengameart.org/content/fantasy-sound-effects-library) / Little Robot Sound Factory | 14,901 下载，131 收藏；Steam 游戏 Tatsu 等开发者在原页说明使用。 | CC-BY-3.0 |
| [Sci-Fi Sound Effects Library](https://opengameart.org/content/sci-fi-sound-effects-library) / Little Robot Sound Factory | 7,339 下载，71 收藏，有游戏采用反馈。 | CC-BY-3.0 |
| [Swishes Sound Pack](https://opengameart.org/content/swishes-sound-pack) / artisticdude | 12,738 下载，82 收藏；为 Summoning Wars 制作。 | CC0-1.0 |
| [3 Melee Sounds](https://opengameart.org/content/3-melee-sounds) / remaxim / Iwan ‘qubodup’ Gabovitch | 15,156 下载，108 收藏；有实际游戏使用反馈。 | CC0-1.0 |
| [20 Sword Sound Effects](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) / StarNinjas | 攻击包 4,240 下载，25 收藏，有游戏使用反馈。 | CC0-1.0 |
| [Level Up, Power Up, Coin Get](https://opengameart.org/content/level-up-power-up-coin-get-13-sounds) / WobbleBoxx Workshop | 36,557 下载，178 收藏；多款开发者发布游戏使用反馈。 | CC0-1.0 |
| [Level Up Sound Effects](https://opengameart.org/content/level-up-sound-effects) / Bart Kelsey（Will Corwin 委托） | 11,494 下载，43 收藏；Steam 游戏 Tatsu 使用反馈。 | CC-BY-3.0 |
| [UI & Item Jingles Sample 2](https://opengameart.org/content/ui-and-item-sound-effect-jingles-sample-2) / ViRiX Dreamcore / soundcloud.com/virix | 6,500 下载，48 收藏；有 Android/iOS 游戏和 Unity 商店使用反馈。 | CC-BY-3.0 |
| [85 Short Music Jingles](https://opengameart.org/content/85-short-music-jingles) / Kenney.nl | 9,475 下载，51 收藏；本轮仅作为乐器提示音备选，不用于枪声。 | CC0-1.0 |
| [Red Eclipse game sound effects](https://opengameart.org/content/red-eclipse-sounds) / Red Eclipse Team（历史游戏音效团队） | 原页 1,496 下载，11 收藏；确为开放游戏的成品声音，包内 package.cfg 将其登记为换弹。 | CC-BY-SA-3.0 |
| [2 Gun Reloads](https://opengameart.org/content/2-gun-reloads) / StarNinjas | 545 下载，2 收藏；热度较低但明确由门部件设计为游戏换弹，作为非实枪风格补充。 | CC0-1.0 |
| [Metal Interactions](https://opengameart.org/content/metal-interactions) / Iwan ‘qubodup’ Gabovitch | 3,629 下载，28 收藏；用于 Nikki and the Robots。 | CC0-1.0 |
| [Item Handling](https://opengameart.org/content/item-handling) / Iwan ‘qubodup’ Gabovitch | 1,741 下载，17 收藏；为 Lips of Suna 录制。 | CC-BY-3.0 |
| [Inventory Bag](https://opengameart.org/content/inventory-bag) / spookymodem | 736 下载，6 收藏；动作匹配补充，不宣称热门单品。 | CC-BY-3.0 |
| [Completion Sound](https://opengameart.org/content/completion-sound) / Brandon Morris / HaelDB | 两条分别 13,654 / 9,355 下载，81 收藏；Dungeon Plunder、Valyria Tear 等使用反馈。 | CC0-1.0 |
| [Pick Up Item (Yo Frankie!)](https://opengameart.org/content/pick-up-item-yo-frankie) / Blender Foundation / Yo Frankie! audio team | 1,235 下载；来自 Blender Foundation 公开游戏，原页明确授权。 | CC-BY-3.0 |
| [Burp #6](https://bigsoundbank.com/burp-6-s3250.html) / Joseph SARDIN & Axeline T. | 单条无公开下载数；5.0 / 10 (average) - 2 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Burp #7](https://bigsoundbank.com/burp-7-s3251.html) / Joseph SARDIN & Axeline T. | 单条无公开下载数；未显示评分。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Burp #8](https://bigsoundbank.com/burp-8-s3252.html) / Joseph SARDIN & Axeline T. | 单条无公开下载数；未显示评分。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Burp #9](https://bigsoundbank.com/burp-9-s3253.html) / Joseph SARDIN & Axeline T. | 单条无公开下载数；未显示评分。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Burp #10](https://bigsoundbank.com/burp-10-s3254.html) / Joseph SARDIN & Axeline T. | 单条无公开下载数；未显示评分。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Eating potato chips #2](https://bigsoundbank.com/eating-potato-chips-2-s1432.html) / Joseph SARDIN | 单条无公开下载数；8.0 / 10 (average) - 1 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Eating](https://soundbible.com/976-Eating.html) / Caroline Ford | 原条目 114,311 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Apple crunched #3](https://bigsoundbank.com/apple-crunched-3-s3081.html) / Joseph SARDIN | 单条无公开下载数；10.0 / 10 (average) - 1 Reviews Comment Very acurate。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Feet in Leaves #1](https://bigsoundbank.com/feet-in-leaves-s0137.html) / Joseph SARDIN | 单条无公开下载数；8.1 / 10 (average) - 129 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Metal box lid](https://bigsoundbank.com/metal-box-lid-s0053.html) / Joseph SARDIN | 单条无公开下载数；9.0 / 10 (average) - 2 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Plastic suitcase](https://bigsoundbank.com/plastic-suitcase-s0801.html) / Joseph SARDIN | 单条无公开下载数；5.4 / 10 (average) - 8 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Door, opening #1](https://bigsoundbank.com/door-opening-1-s2428.html) / Joseph SARDIN | 单条无公开下载数；未显示评分。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Metal filing cabinet](https://bigsoundbank.com/metal-filing-cabinet-s0773.html) / Joseph SARDIN | 单条无公开下载数；6.0 / 10 (average) - 5 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Metal drawer #1](https://bigsoundbank.com/metal-drawers-1-s0792.html) / Joseph SARDIN | 单条无公开下载数；5.1 / 10 (average) - 7 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Wooden drawer, opening](https://bigsoundbank.com/wooden-drawer-opening-s1499.html) / Joseph SARDIN | 单条无公开下载数；9.0 / 10 (average) - 2 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Zipper #2](https://bigsoundbank.com/zipper-2-s0270.html) / DenisChardonnet | 单条无公开下载数；6.0 / 10 (average) - 19 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |
| [Canvas bag on floor](https://bigsoundbank.com/canvas-bag-on-floor-s0576.html) / Joseph SARDIN | 单条无公开下载数；6.2 / 10 (average) - 5 Reviews。按动作匹配补充，不冒充热门单品。 | CC0-1.0 |

## 逐类五个候选

以下都是待选择，并没有预先替用户确认。卡片可展开未经剪辑的完整源音；文件名、剪切点、组件增益、哈希都在 manifest 中。

### 换弹 · 游戏设计成品

5 条游戏/开发者成品，保留末段机械操作。没有复用 E/G/H 的实枪录音；可按时长比较，最终机件听感以试听选择为准。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| RE1 | 游戏手枪 · 末段机件扣回 | Red Eclipse Team（历史游戏音效团队） | 0.86s | 开放游戏 Red Eclipse 的成品 reload 文件；保留作者原速完整动作，不使用现场射击录音。 |
| RE2 | 游戏冲锋枪 · 装匣后拉动机件 | Red Eclipse Team（历史游戏音效团队） | 1.53s | 开放游戏 Red Eclipse 的成品 reload 文件；保留作者原速完整动作，不使用现场射击录音。 |
| RE3 | 游戏步枪 · 紧凑机件收尾 | Red Eclipse Team（历史游戏音效团队） | 1.01s | 开放游戏 Red Eclipse 的成品 reload 文件；保留作者原速完整动作，不使用现场射击录音。 |
| RE4 | 开发者设计 · 简短换弹 | StarNinjas | 0.78s | StarNinjas 用门部件为游戏设计的成品，非实枪现场录音；原声原速，末段为作者保留的机械收尾。此包热度较低，明确作为风格补充。 |
| RE5 | 开发者设计 · 分段换弹与末尾扣回 | StarNinjas | 1.27s | StarNinjas 用门部件为游戏设计的成品，非实枪现场录音；原声原速，末段为作者保留的机械收尾。此包热度较低，明确作为风格补充。 |

### 挥刀劈砍

按现有 0.45 秒攻速比较；保留刀刃/空气动作，不把击中重物当作空挥。另可连听 5 次挥砍。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| KN1 | 短刀轻挥 | artisticdude | 0.09s | 作者原动作只裁取快挥段；完整原声可展开。 |
| KN2 | 刀刃快速劈砍 | remaxim / Iwan ‘qubodup’ Gabovitch | 0.41s | 作者原动作只裁取快挥段；完整原声可展开。 |
| KN3 | 清楚的金属挥动 | StarNinjas | 0.41s | 作者原动作只裁取快挥段；完整原声可展开。 |
| KN4 | 短刃切风 | rubberduck | 0.32s | 作者原动作只裁取快挥段；完整原声可展开。 |
| KN5 | 游戏式利落横劈 | Red Eclipse Team（历史游戏音效团队） | 0.41s | 作者原动作只裁取快挥段；完整原声可展开。 |

### 四级食物 · 轻短嗝

5 个自然短嗝方向，均比上轮男性粗嗝更短；原作者为同一表演者的五次录音。请结合吃饭声试听是否有你想要的小奶嗝感觉。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| BU1 | 轻轻一嗝 | Joseph SARDIN & Axeline T. | 0.41s | 原页标注 Axeline T. 的自然轻女声嗝，不是婴儿实录。五个独立录音，不做变调或夸大共振。 |
| BU2 | 短促小嗝 | Joseph SARDIN & Axeline T. | 0.41s | 原页标注 Axeline T. 的自然轻女声嗝，不是婴儿实录。五个独立录音，不做变调或夸大共振。 |
| BU3 | 细碎软嗝 | Joseph SARDIN & Axeline T. | 0.46s | 原页标注 Axeline T. 的自然轻女声嗝，不是婴儿实录。五个独立录音，不做变调或夸大共振。 |
| BU4 | 一小口短嗝 | Joseph SARDIN & Axeline T. | 0.31s | 原页标注 Axeline T. 的自然轻女声嗝，不是婴儿实录。五个独立录音，不做变调或夸大共振。 |
| BU5 | 柔短收尾 | Joseph SARDIN & Axeline T. | 0.41s | 原页标注 Axeline T. 的自然轻女声嗝，不是婴儿实录。五个独立录音，不做变调或夸大共振。 |

### 四级食物 · 小口吃饭

5 个吃饭候选、两个现有食用时长；下方另选短嗝，上方组合试听。优先比较 ME2 的猫咪进食与 ME3 的轻柔细嚼。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| ME1 | 轻脆小口吃 | Joseph SARDIN | 1.20s / 2.40s | 只有吃饭动作，末尾约半秒留给短嗝。可在上方自由组合试听；四级食物统一为吃饭＋短嗝，不再要求吸面或夸张大吃。 |
| ME2 | 猫咪小口嚼 | Jason Steele / FilmCow | 1.20s / 2.40s | 只有吃饭动作，末尾约半秒留给短嗝。可在上方自由组合试听；四级食物统一为吃饭＋短嗝，不再要求吸面或夸张大吃。 |
| ME3 | 轻柔细嚼 | Caroline Ford | 1.20s / 2.40s | 只有吃饭动作，末尾约半秒留给短嗝。可在上方自由组合试听；四级食物统一为吃饭＋短嗝，不再要求吸面或夸张大吃。 |
| ME4 | 卡通小口脆嚼 | Tito / StarNinjas | 1.20s / 2.40s | 只有吃饭动作，末尾约半秒留给短嗝。可在上方自由组合试听；四级食物统一为吃饭＋短嗝，不再要求吸面或夸张大吃。 |
| ME5 | 轻咬后咀嚼 | Joseph SARDIN | 1.20s / 2.40s | 只有吃饭动作，末尾约半秒留给短嗝。可在上方自由组合试听；四级食物统一为吃饭＋短嗝，不再要求吸面或夸张大吃。 |

### 打开 · 纸箱

以纸板掀盖和纸材翻折为主，避免金属箱声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| BX1 | 纸箱掀盖 · 干脆 | Jason Steele / FilmCow | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BX2 | 纸板翻开 · 柔和 | Jason Steele / FilmCow | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BX3 | 纸材展开 | rubberduck | 0.43s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BX4 | 薄纸翻折 | artisticdude（Ogrebane 发布） | 0.71s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BX5 | 厚纸箱掀开 | Jason Steele / FilmCow | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 鸟窝

拨开草叶、细枝；不添加鸟叫或粗重箱盖。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| NW1 | 轻拨草叶 | Jason Steele / FilmCow | 0.76s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| NW2 | 细枝移动 | Jason Steele / FilmCow | 0.76s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| NW3 | 干叶轻响 | Joseph SARDIN | 0.66s | 原录音是踩干叶，只取轻的叶片材料声作鸟窝备选，不宣称鸟窝现场实录。 |
| NW4 | 松软叶片翻动 | Jason Steele / FilmCow | 0.81s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| NW5 | 细枝轻折 | rubberduck | 0.18s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 生锈工具盒

短金属扣、盒盖与小型铰链。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| TB1 | 单扣掀开 | Jason Steele / FilmCow | 0.66s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| TB2 | 薄金属盒盖 | Joseph SARDIN | 1.01s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| TB3 | 旧金属铰链 | rubberduck | 0.91s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| TB4 | 较厚的盒扣 | Iwan ‘qubodup’ Gabovitch | 0.59s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| TB5 | 轻金属锁扣 | Jason Steele / FilmCow | 0.66s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 乡间保温箱

硬塑料盖与短扣合；不使用保险柜的重金属声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| CL1 | 轻塑料盖 | Jason Steele / FilmCow | 0.73s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CL2 | 硬壳箱掀开 | Joseph SARDIN | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CL3 | 柔性塑料盖边 | OwlishMedia | 0.71s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CL4 | 塑料铰链 | Joseph SARDIN | 1.01s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CL5 | 略紧的塑料扣 | Jason Steele / FilmCow | 0.37s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 绿色垃圾桶

塑料桶盖掀起，略空心；避免玻璃破碎和金属大门。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| GB1 | 空心塑料盖 | Jason Steele / FilmCow | 0.37s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| GB2 | 短塑料摩擦 | OwlishMedia | 0.51s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| GB3 | 盖沿滑动 | Jason Steele / FilmCow | 0.81s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| GB4 | 塑料铰链掀开 | Joseph SARDIN | 0.91s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| GB5 | 硬塑料门扣 | rubberduck | 0.66s | 原动作为微波炉塑料门，作桶盖扣件材质备选。 |

### 打开 · 猫砂桶

轻塑料桶口、盖沿与沙料的视觉材质；与工具柜区分。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| LT1 | 轻塑料口 | Jason Steele / FilmCow | 0.76s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| LT2 | 柔软盖沿 | OwlishMedia | 0.66s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| LT3 | 塑料边扣 | Jason Steele / FilmCow | 0.66s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| LT4 | 细小干料桶 | Jason Steele / FilmCow | 0.77s | 原录音是坚果容器，提供细颗粒干料/塑料桶材质，不冒充猫砂实录。 |
| LT5 | 硬塑料盖 | Joseph SARDIN | 0.86s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 工具柜

以抽屉滑轨、柜门与五金为主，明显区别于纸箱。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| CB1 | 柜门与五金 | Jason Steele / FilmCow | 1.06s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CB2 | 金属文件柜滑轨 | Joseph SARDIN | 1.21s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CB3 | 金属抽屉开启 | Joseph SARDIN | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CB4 | 旧金属柜门 | rubberduck | 1.01s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| CB5 | 木质工具抽屉 | Joseph SARDIN | 0.99s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 医疗箱

软包拉链或小塑料箱扣，清楚但轻。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| MD1 | 短拉链医疗包 | Jason Steele / FilmCow | 0.81s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| MD2 | 细拉链开启 | DenisChardonnet | 0.81s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| MD3 | 轻医疗箱盖 | Jason Steele / FilmCow | 0.71s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| MD4 | 布质急救包 | artisticdude（Ogrebane 发布） | 0.60s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| MD5 | 塑料夹扣 | OwlishMedia | 0.71s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 武器箱

较紧的金属箱扣与箱盖，保持短促。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| WX1 | 硬箱掀开 | Jason Steele / FilmCow | 1.01s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| WX2 | 沉实金属扣 | Jason Steele / FilmCow | 0.71s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| WX3 | 金属盖分离 | Joseph SARDIN | 1.01s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| WX4 | 箱锁开启 | rubberduck | 0.39s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| WX5 | 厚锁扣与机件 | Iwan ‘qubodup’ Gabovitch | 0.51s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 豪华猫窝

拨开软布、窝垫；不用钥匙、金属或开大门的声音。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| BD1 | 窝布轻翻 | Jason Steele / FilmCow | 0.86s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BD2 | 轻布料展开 | artisticdude（Ogrebane 发布） | 0.60s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BD3 | 短布层拨开 | OwlishMedia | 0.35s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BD4 | 软垫摩擦 | Jason Steele / FilmCow | 0.91s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BD5 | 厚布层 | artisticdude | 0.41s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 保险箱

锁舌、机械扣件与重柜门，强调厚重且避免爆炸。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| SF1 | 锁舌拨开 | Jason Steele / FilmCow | 0.86s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| SF2 | 机械锁开启 | rubberduck | 0.31s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| SF3 | 重柜门与轨道 | Joseph SARDIN | 1.21s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| SF4 | 金属锁舌移开 | Iwan ‘qubodup’ Gabovitch | 0.51s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| SF5 | 柜门缓开 | Jason Steele / FilmCow | 1.10s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · 普通战利品盒

小盒扣或小包开启，与场景大柜门不同。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| DL1 | 小盒轻开 | Jason Steele / FilmCow | 0.28s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| DL2 | 小盒扣 | rubberduck | 0.37s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| DL3 | 拿起盒中物件 | Iwan ‘qubodup’ Gabovitch | 0.36s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| DL4 | 短扣打开 | Jason Steele / FilmCow | 0.56s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| DL5 | 轻塑料盒 | OwlishMedia | 0.61s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 打开 · Boss 战利品盒

比普通盒更明确的扣件与箱体质感，不在打开时提前播放传说发现声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| BL1 | 厚箱开盖 | Jason Steele / FilmCow | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BL2 | 双重机械感锁扣 | rubberduck | 0.31s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BL3 | 高质金属盒盖 | Joseph SARDIN | 1.11s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BL4 | 结实箱体掀开 | Jason Steele / FilmCow | 0.36s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |
| BL5 | 重盒铰链 | rubberduck | 0.91s | 材质动作候选，原录音仅剪去停顿与固定音量匹配；原动作名称与来源可展开。 |

### 持续搜索过程

轻声翻找、物件摩擦。可选 2/4/6 秒连续试听；参考搜刮节奏而非提取其他游戏音频。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| SC1 | 细致翻找抽屉 | Jason Steele / FilmCow | 1.45s | 原动作翻找/拿动录音，只做固定音量与剪切。可循环，不用无关风暴或电子噪声冒充搜索。 |
| SC2 | 较轻的物件翻动 | Jason Steele / FilmCow | 2.01s | 原动作翻找/拿动录音，只做固定音量与剪切。可循环，不用无关风暴或电子噪声冒充搜索。 |
| SC3 | 软包内翻找 | spookymodem | 1.30s | 原动作翻找/拿动录音，只做固定音量与剪切。可循环，不用无关风暴或电子噪声冒充搜索。 |
| SC4 | 纸材翻找 | Jason Steele / FilmCow | 1.51s | 原动作翻找/拿动录音，只做固定音量与剪切。可循环，不用无关风暴或电子噪声冒充搜索。 |
| SC5 | 物件拿动与搜寻 | Iwan ‘qubodup’ Gabovitch | 0.24s | 原动作翻找/拿动录音，只做固定音量与剪切。可循环，不用无关风暴或电子噪声冒充搜索。 |

### 发现物品 · 1–2 级共用

原作者已制作的确认/奖励音，不自创旋律；级别越高，主要通过声音展开与完整度区别，而非单纯变大声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| D12-1 | 简短清亮发现 | Brandon Morris / HaelDB | 0.69s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D12-2 | 卡通物品发现 | Blender Foundation / Yo Frankie! audio team | 0.33s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D12-3 | 轻触确认 | Little Robot Sound Factory | 0.15s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D12-4 | 小物件入手 | WobbleBoxx Workshop | 2.56s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D12-5 | 小宝石闪光 | rubberduck | 0.26s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |

### 发现物品 · 3 级珍贵

原作者已制作的确认/奖励音，不自创旋律；级别越高，主要通过声音展开与完整度区别，而非单纯变大声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| D3-1 | 清亮小奖励 | Brandon Morris / HaelDB | 1.33s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D3-2 | 明亮物品奖励 | ViRiX Dreamcore / soundcloud.com/virix | 2.35s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D3-3 | 短上扬奖励 | WobbleBoxx Workshop | 1.77s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D3-4 | 玻璃铃奖励 | Bart Kelsey（Will Corwin 委托） | 2.39s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D3-5 | 金币获得感 | Little Robot Sound Factory | 0.36s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |

### 发现物品 · 4 级稀世

原作者已制作的确认/奖励音，不自创旋律；级别越高，主要通过声音展开与完整度区别，而非单纯变大声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| D4-1 | 成就式发现 | Little Robot Sound Factory | 3.57s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D4-2 | 清晰上升提示 | Little Robot Sound Factory | 4.51s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D4-3 | 连续上扬奖励 | WobbleBoxx Workshop | 1.57s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D4-4 | 钢琴小惊喜 | Bart Kelsey（Will Corwin 委托） | 2.40s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D4-5 | 拨弦式金色发现 | Kenney.nl | 0.80s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |

### 发现物品 · 5 级传说

原作者已制作的确认/奖励音，不自创旋律；级别越高，主要通过声音展开与完整度区别，而非单纯变大声。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| D5-1 | 胜利式大收获 | Little Robot Sound Factory | 10.01s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D5-2 | 华彩完成感 | Little Robot Sound Factory | 5.94s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D5-3 | 层层上扬发现 | WobbleBoxx Workshop | 2.51s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D5-4 | 管弦乐大惊喜 | Bart Kelsey（Will Corwin 委托） | 1.86s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |
| D5-5 | 亮丽钟琴奖励 | Kenney.nl | 0.91s | 成品奖励音，只匹配固定响度；保留原旋律及自然尾声。 |

### 装进背包

短收纳动作；区别于装备到栏位、打开箱子和发现高品质物品。

| 编号 | 候选 / 原材质 | 作者 | 时长 | 比较要点 |
| --- | --- | --- | --- | --- |
| PK1 | 物品放入软包 | spookymodem | 0.81s | 材料原声，不额外叠加武器上膛或高级发现声。 |
| PK2 | 皮包收纳 | artisticdude（Ogrebane 发布） | 0.81s | 材料原声，不额外叠加武器上膛或高级发现声。 |
| PK3 | 拉链袋收纳 | Jason Steele / FilmCow | 0.35s | 材料原声，不额外叠加武器上膛或高级发现声。 |
| PK4 | 物件入包 | Iwan ‘qubodup’ Gabovitch | 0.28s | 材料原声，不额外叠加武器上膛或高级发现声。 |
| PK5 | 帆布袋接物 | Joseph SARDIN | 0.91s | 材料原声，不额外叠加武器上膛或高级发现声。 |

## 可复现配方与许可

- `scripts/assets/interaction-audio-sources.json` 固定100原文件SHA-256、来源、原文件名/包内路径、23组配方；`public/audio-review/interactions/manifest-v1.json` 还固定全部最终FLAC哈希和处理增益。
- 将原作者文件解包后按 recipe 的 `sources[].path` 放入缓存（本次为 `/tmp/audio-interactions-research/flat`）；按 `sourceSha256` 校验原件，再运行：

```sh
python scripts/assets/build-action-audio-review.py --cache /tmp/audio-interactions-research --recipe scripts/assets/interaction-audio-sources.json --out public/audio-review/interactions
```

- 通用构建器支持 `--recipe`、`--out`；默认参数仍生成上一轮试听，不修改 `src/`。包文件哈希另在 `sourcePacks` 记录；来源站点可能变化，当前生成结果和原声参考均随站保留。
- CC0、CC BY 3.0、CC BY-SA 3.0 全文及 FilmCow 专用许可随页发布。Red Eclipse 使用2015原发行CC BY-SA 3.0，对应改编也以同许可提供；不以现行仓库4.0反向覆盖本批历史文件许可。
- ViRiX 必须保留：Some of the sounds in this project were created by ViRiX Dreamcore soundcloud.com/virix
- 页面全部素材与改动署名见 `public/audio-review/interactions/licenses/index.html`。不能将 FilmCow 的专用免版税许可误写成CC0。

## 本次验证范围

只验证本次采用的音频接线与新试听页，不重复全量游戏测试。采用音频的专项验证见 [采用记录](AUDIO_APPROVED_ACTIONS.md)；试听页在真实Chrome检查115候选/100原声的哈希和解码、默认100%音量、23分类、选择复制、停止与组合时序，以及手机布局和弹窗。构建检查新候选不进入普通玩家离线预缓存。上线只核验新版本及新页面资源可达，不重新跑全量游戏流程。
