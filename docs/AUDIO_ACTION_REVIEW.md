# 动作与进食音效试听（待用户选择）

试听地址：https://biscuit19.github.io/CodexGame2/audio-review/actions/index.html

本轮只发布独立试听页。游戏现用的枪声、换弹、翻滚、装备、进食和物品数据未修改；源码 `src/` 没有本轮改动。新增试听素材不放入游戏离线预缓存，页面按用户点击加载。

## 范围与使用方式

12 类 × 每类 5 个候选 = 60 个候选。猫条/冰淇淋和水/核爪饮品各有独立食用时长版本，合计 70 个时长版本；高等级食物另附可关闭恢复点缀的纯食物版本。提供完整原声展开、单条试听、同类连听、停止、100% 初始音量和选择清单复制。

“装备”是从容器进入装备栏，不是局内切枪。本轮换弹是新增比较，不覆盖已确定的枪声和现用换弹。

## 搜索与筛选依据

先读开发者推荐与热门发行页，再检查原作者说明、实际动作、许可和具体文件；不是从 GitHub 搜索并挑包。Reddit 直连 403，通过 Brave 的搜索索引取得讨论和回答摘要，原作者页面独立核验许可。Google 当前返回 JS 跳转，Bing 返回不相关结果；Brave 在后续查询中返回 429/验证页后停止使用，没有绕过限制。Freesound 访问 403 的条目未使用。

| 开发者/平台依据 | 核验结果 |
| --- | --- |
| [开发者推荐：游戏音效的转折点](https://www.reddit.com/r/gamedev/comments/1mh8943/what_was_your_game_changer_for_sfx_when_you_were/) | 通过 Brave 索引读到社区总结：推荐 Sonniss、FilmCow、Freesound，强调按动作组成寻找。Reddit 直连返回 403，未把索引当作原始授权。 |
| [翻滚音效的 Foley 组成](https://www.reddit.com/r/GameAudio/comments/kfwr6e/looking_for_audio_of_a_person_rolling_like_in_a/) | 搜索索引中最高回答建议布料摩擦、材料触地与重量组件；不是单纯风声。 |
| [itch.io 免费音效热门页](https://itch.io/game-assets/free/tag-sound-effects) | 本次 FilmCow 第3、Nox Essentials 第9；只是该页默认热门排序，不是全球使用榜。 |
| [Sonniss GDC](https://sonniss.com/gameaudiogdc/) | 社区广泛推荐且可用于游戏，但明确禁止单独分发音效；不把其文件打包在公开逐条试听页，仅保留官方来源备选。 |
| [Mixkit](https://mixkit.co/terms/) | 存在咀嚼候选；独立音效托管/再分发限制，不纳入本次本地试听。 |
| [Nox Essentials](https://nox-sound-design.itch.io/essentials-series-sfx-nox-sound) | 5.0/5，51评分，CC0。实为环境、脚步、声音动作等；不能用脚步冒充完整翻滚，未强行补齐。 |
| [AllSlayer Equipment](https://allslayer.itch.io/equipment-inventory-audio-pack) | 作者明确大量失真、降至22050Hz，评分1.5/5（2评分）；与用户希望的干净听感不符，排除。 |
| [Freesound](https://freesound.org/) | 平台页面访问受限，未绕过访问限制；未取得原页许可的文件不使用。 |

不把平台或厂牌知名度当作单包下载量，不把下载次数当作游戏采用数。核心来源有真实高下载/评分与使用反馈；少数具体舔食/吞咽组件热度证据偏弱，在卡片标为补充，没有把它们包装成热门单品。音效年龄本身不决定质量，但不能借“老库”掩饰没有使用依据。

## 素材比较

| 素材 / 作者 | 动作或用途 | 使用量/评分与采用依据 | 授权 |
| --- | --- | --- | --- |
| [FilmCow Recorded SFX](https://filmcow.itch.io/filmcow-sfx) / Jason Steele / FilmCow | bag of tortilla chips 3.wav, bag of tortilla chips 6.wav, body fall 12.wav, body fall 5.wav, body fall 7.wav, body fall 9.wav, box of cereal handled 4.wav, cat eating.wav, clothing movement 12.wav, clothing movement 17.wav, drinking and swallowing 2.wav, drinking and swallowing 3.wav, gun movement 10.wav, gun movement 17.wav, zipper 7.wav | 4.9/5，134 条评分；本次 itch.io 免费音效热门页第 3；评论含多款已发布游戏链接。 | FilmCow Royalty Free SFX License |
| [RPG Sound Pack](https://opengameart.org/content/rpg-sound-pack) / artisticdude | inventory/armor-light.wav, inventory/bubble.wav, inventory/bubble2.wav, inventory/bubble3.wav, inventory/cloth.wav, inventory/metal-small2.wav, misc/burp.wav | 65,122 次下载，410 收藏；原用于 Summoning Wars / FLARE，评论有实际采用反馈。 | CC0-1.0 |
| [Inventory Sound Effects](https://opengameart.org/content/inventory-sound-effects) / artisticdude（Ogrebane 发布） | cloth-inventory.wav, leather_inventory.wav | 15,434 次下载，156 收藏；为 Summoning Wars 制作，OSARE/FLARE 开发者在原页说明使用。 | CC-BY-3.0 |
| [202 More Sound Effects](https://opengameart.org/content/202-more-sound-effects) / OwlishMedia | Cloth/Cloth_04.wav, Cloth/Cloth_05.wav, Drink/Drink_01.wav, Drink/Drink_05.wav, Plastic/Plastic_06.wav, Velcro/Velcro_03.wav | 5,353 次下载，49 收藏；包含录制的饮水、布料、魔术贴，评论有使用作品。 | CC0-1.0 |
| [7 Eating Crunches](https://opengameart.org/content/7-eating-crunches) / Tito / StarNinjas | crunch.3.ogg | 2,530 次下载，15 收藏；有猫咪进食游戏 Feeding Nekotan 的实际使用反馈。 | CC0-1.0 |
| [Gun reload sounds](https://opengameart.org/content/gun-reload-sounds) / SpringySpringo | spring-assaultriflereload1_0.wav, spring-gunreload1.wav | 手枪/步枪/枪机分别 2,094 / 1,681 / 1,397 次下载；16 收藏。热度中等，动作匹配补充。 | CC0-1.0 |
| [Handgun Reload Sound Effect](https://opengameart.org/content/handgun-reload-sound-effect) / zer0_sol | zero-reload.wav | 1,990 次下载，18 收藏；真实弹匣退出、装入、拉套筒。热度中等，动作匹配补充。 | CC0-1.0 |
| [Handling Guns](https://opengameart.org/content/handling-guns) / Gary / fossilrecords.net（qubodup 发布） | 45ACP_Loading.wav, 45ACP_slide.wav | 3,927 次下载，39 收藏；为 PARPG 录制，提供操作时间清单。 | CC-BY-SA-3.0 |
| [Q009’s weapon sounds](https://opengameart.org/content/q009s-weapon-sounds) / Q009 | weapswitch.ogg | 7,067 次下载，52 收藏；最初为 Cube 2: Sauerbraten 制作，有多款游戏使用反馈。 | CC-BY-SA-3.0 |
| [Liquid Bottle Drink Set](https://opengameart.org/content/liquid-bottle-drink-set) / Iwan ‘qubodup’ Gabovitch | swallow-01.flac, swallow-05.flac | 1,323 次下载，10 收藏；明确录制开瓶和吞咽。热度中等，仅作为吞咽动作补充。 | CC0-1.0 |
| [8 Heals and Buffs SFX](https://opengameart.org/content/8-heals-and-buffs-sfx) / leohpaz | 02_Heal_02.wav | 1,561 次下载，12 收藏；Steam 游戏 Holy Heroes 开发者在原页说明使用。只作低音量恢复点缀。 | CC-BY-4.0 |
| [3 Heal Spells](https://opengameart.org/content/3-heal-spells) / DoKashiteru | healspell2.aif | 6,961 次下载，58 收藏；评论有 Lost Labyrinth 等游戏采用。只作低音量恢复点缀。 | CC-BY-3.0 |
| [Eating](https://soundbible.com/976-Eating.html) / Caroline Ford | Eating | 原条目 114,311 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Eating Chips](https://soundbible.com/402-Eating-Chips.html) / Mike Koenig | Eating Chips | 原条目 71,670 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Eat Chips](https://soundbible.com/912-Eat-Chips.html) / Caroline Ford | Eat Chips | 原条目 57,193 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Beer Can Opening](https://soundbible.com/216-Beer-Can-Opening.html) / Mike Koenig | Beer Can Opening | 原条目 90,501 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Open Soda Can](https://soundbible.com/1659-Open-Soda-Can.html) / KP | Open Soda Can | 原条目 53,157 次下载（不是游戏采用项目数）。 | Public Domain |
| [Short Male Burp](https://soundbible.com/1867-Short-Male-Burp.html) / Mike Koenig | Short Male Burp | 原条目 34,200 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Belch](https://soundbible.com/1579-Belch.html) / Kevan | Belch | 原条目 125,075 次下载（不是游戏采用项目数）。 | Public Domain |
| [Burp 2x](https://soundbible.com/645-Burp-2x.html) / Mike Koenig | Burp 2x | 原条目 41,407 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Straw Slurp Normal](https://soundbible.com/856-Straw-Slurp-Normal.html) / Mike Koenig | Straw Slurp Normal | 原条目 27,887 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Straw Slurp](https://soundbible.com/860-Straw-Slurp.html) / Mike Koenig | Straw Slurp | 原条目 27,086 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Straw Slurp 3](https://soundbible.com/842-Straw-Slurp-3.html) / Mike Koenig | Straw Slurp 3 | 原条目 23,859 次下载（不是游戏采用项目数）。 | CC-BY-3.0 |
| [Lock And Load](https://soundbible.com/1069-Lock-And-Load.html) / Mike Koenig | Lock And Load | 原条目 51,058 次下载；机枪上弹成品原声。 | CC-BY-3.0 |
| [Licking #1](https://bigsoundbank.com/licking-1-s0238.html) / DenisChardonnet | licking-1 | 此单条无公开下载数；8.3 / 10 (average) - 4 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Licking #2](https://bigsoundbank.com/licking-2-s0239.html) / DenisChardonnet | licking-2 | 此单条无公开下载数；5.0 / 10 (average) - 2 Reviews Comment Exactly what i needed!。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Mouth Noises #1](https://bigsoundbank.com/mouth-noises-1-s0352.html) / DavidGreck | mouth-noises-1 | 此单条无公开下载数；6.1 / 10 (average) - 17 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Mouth noises #2](https://bigsoundbank.com/mouth-noises-2-s0353.html) / DavidGreck | mouth-noises-2 | 此单条无公开下载数；3.6 / 10 (average) - 7 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Straw, suction #1](https://bigsoundbank.com/straw-suction-1-s1244.html) / Joseph SARDIN | straw-suction-1 | 此单条无公开下载数；8.0 / 10 (average) - 1 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Straw, suction #2](https://bigsoundbank.com/straw-suction-2-s1245.html) / Joseph SARDIN | straw-suction-2 | 此单条无公开下载数；8.8 / 10 (average) - 4 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |
| [Eat a Rusk](https://bigsoundbank.com/eat-a-rusk-s0407.html) / Joseph SARDIN | eat-a-rusk | 此单条无公开下载数；6.2 / 10 (average) - 43 Reviews。动作匹配补充，不宣称热门单品。 | CC0-1.0 |

排除：AllSlayer 作者明确以失真和 22050 Hz 为风格，且评分较低；不符合干净听感。Sonniss GDC 被社区广泛推荐，但许可禁止独立声音再分发，所以本轮不托管逐文件；Mixkit 的独立库存/再分发条款不适合本试听页。Nox 的热门 Essentials 包原动作并非完整翻滚，不拿脚步强行冒充翻滚。独立湿黏冲击库虽下载量高，但偏受伤/血肉，不用于食物。

## 物品与当前游戏时长

| 类别 | 物品 | 现用时间/恢复效果 |
| --- | --- | --- |
| 低级固体 · 小鱼干 | 小鱼干（1 级） | 1 秒；立即恢复 12 生命 |
| 低级软食 · 猫条与冰淇淋 | 肉泥猫条（2 级） | 1.4 秒；立即恢复 20 生命 |
| 低级软食 · 猫条与冰淇淋 | 蜜雪喵城冰淇淋（2 级） | 1.2 秒；立即恢复 18 生命 |
| 低级液体 · 水与核爪饮品 | 喵哈哈矿泉水（1 级） | 1 秒；10 秒内持续恢复 22 生命 |
| 低级液体 · 水与核爪饮品 | 六个核爪（2 级） | 1.4 秒；12 秒内持续恢复 32 生命 |
| 三级食物 · 金枪鱼罐头 | 金枪鱼罐头（3 级） | 2 秒；立即恢复 30 生命 |
| 三级食物 · 疯狂薯四 | 肯喵基疯狂薯四（3 级） | 1.8 秒；立即恢复 28 生命 |
| 三级食物 · 快乐餐盒 | 金拱喵快乐餐盒（3 级） | 1.8 秒；立即恢复 18；10 秒内持续恢复 28 生命 |
| 四级食物 · 红烧鱼面 | 喵师傅红烧鱼面（4 级） | 2.4 秒；立即恢复 24；16 秒内持续恢复 48 生命 |
| 四级食物 · 海鲜拼盘 | 豪华海鲜拼盘（4 级） | 1.2 秒；立即恢复 60 生命 |

海鲜拼盘当前源码为立即恢复 60，食用 1.2 秒（不是持续恢复）；本轮按实际配置制作，不修改效果。方便面、快乐餐盒以“食物动作 + 立即恢复完成 + 很轻的持续恢复启动”区别；原食物声始终在前景，恢复尾声不反复循环。

## 每类五个候选

每条组合均可展开其所有完整原录音；不是将一段相同声音变调五次。“吸溜面”是吸食组件的动作设计，来源中有吸管录音；开罐使用拉环组件，来源中有饮料罐，均在卡片明确说明。翻滚是衣物摩擦与身体着地组合，不声称有五条原作者完整翻滚录音。

| 编号 | 候选 | 比较重点 | 精确来源 |
| --- | --- | --- | --- |
| R1 | 轻型步枪 · 完整换弹 | 气动枪录音；弹匣和机件清楚，较轻。 推荐先比较 R1 和 R2：完整动作、节奏易识别。 | [SpringySpringo / spring-assaultriflereload1_0.wav](https://opengameart.org/content/gun-reload-sounds) |
| R2 | 手枪结构 · 弹匣退出＋装入＋上膛 | 完整换弹，不把单次机械点击冒充完整换弹。 推荐先比较 R1 和 R2：完整动作、节奏易识别。 | [zer0_sol / zero-reload.wav](https://opengameart.org/content/handgun-reload-sound-effect) |
| R3 | 轻型短枪 · 完整换弹 | 与 R1 同作者的另一套动作录音，不是变调副本。  | [SpringySpringo / spring-gunreload1.wav](https://opengameart.org/content/gun-reload-sounds) |
| R4 | 金属结构 · 换匣与上膛 | 取作者标注的装匣和上膛段，去掉原录音中间的长停顿。  | [Gary / fossilrecords.net（qubodup 发布） / 45ACP_Loading.wav](https://opengameart.org/content/handling-guns) |
| R5 | 偏重机械 · 换匣与上膛 | 原作者仅录制机枪装入弹匣；这里配合 Gary 退匣和上膛组成换弹示例，不称为原作者完整换弹。  | [Gary / fossilrecords.net（qubodup 发布） / 45ACP_Loading.wav](https://opengameart.org/content/handling-guns)；[Mike Koenig / Lock And Load](https://soundbible.com/1069-Lock-And-Load.html)；[Gary / fossilrecords.net（qubodup 发布） / 45ACP_slide.wav](https://opengameart.org/content/handling-guns) |
| T1 | 轻布翻身＋轻落地 | 动作组合，不是原作者录制的完整翻滚；0–0.35 秒翻身，落地尾音到 0.43 秒。 T1 / T2 优先：柔软、短促；没有爆炸、风暴或金属碰撞层。 | [Jason Steele / FilmCow / clothing movement 12.wav](https://filmcow.itch.io/filmcow-sfx)；[Jason Steele / FilmCow / body fall 9.wav](https://filmcow.itch.io/filmcow-sfx) |
| T2 | 短布擦动＋身体落地 | 动作组合，不是原作者录制的完整翻滚；0–0.35 秒翻身，落地尾音到 0.43 秒。 T1 / T2 优先：柔软、短促；没有爆炸、风暴或金属碰撞层。 | [OwlishMedia / Cloth/Cloth_05.wav](https://opengameart.org/content/202-more-sound-effects)；[Jason Steele / FilmCow / body fall 7.wav](https://filmcow.itch.io/filmcow-sfx) |
| T3 | 柔软衣物＋分段着地 | 动作组合，不是原作者录制的完整翻滚；0–0.35 秒翻身，落地尾音到 0.43 秒。  | [Jason Steele / FilmCow / clothing movement 17.wav](https://filmcow.itch.io/filmcow-sfx)；[Jason Steele / FilmCow / body fall 12.wav](https://filmcow.itch.io/filmcow-sfx) |
| T4 | 紧凑衣物＋较有重量的着地 | 动作组合，不是原作者录制的完整翻滚；0–0.35 秒翻身，落地尾音到 0.43 秒。  | [OwlishMedia / Cloth/Cloth_04.wav](https://opengameart.org/content/202-more-sound-effects)；[Jason Steele / FilmCow / body fall 5.wav](https://filmcow.itch.io/filmcow-sfx) |
| T5 | 游戏布料＋短落地 | 动作组合，不是原作者录制的完整翻滚；0–0.35 秒翻身，落地尾音到 0.43 秒。  | [artisticdude / inventory/cloth.wav](https://opengameart.org/content/rpg-sound-pack)；[Jason Steele / FilmCow / body fall 9.wav](https://filmcow.itch.io/filmcow-sfx) |
| W1 | 拿动枪械 · 稍有重量 | 仅用于从容器装备进入栏位；不用于局内滚轮切枪。机械式候选会比纯拿取更强调机件。 W1 / W2 是拿动枪械原声；W3 是实际游戏使用的作者设计音。 | [Jason Steele / FilmCow / gun movement 10.wav](https://filmcow.itch.io/filmcow-sfx) |
| W2 | 拿动枪械 · 轻操作 | 仅用于从容器装备进入栏位；不用于局内滚轮切枪。机械式候选会比纯拿取更强调机件。 W1 / W2 是拿动枪械原声；W3 是实际游戏使用的作者设计音。 | [Jason Steele / FilmCow / gun movement 17.wav](https://filmcow.itch.io/filmcow-sfx) |
| W3 | 游戏成品 · 紧凑武器拿取 | 仅用于从容器装备进入栏位；不用于局内滚轮切枪。机械式候选会比纯拿取更强调机件。 W1 / W2 是拿动枪械原声；W3 是实际游戏使用的作者设计音。 | [Q009 / weapswitch.ogg](https://opengameart.org/content/q009s-weapon-sounds) |
| W4 | 机械式 · 短拉机件 | 仅用于从容器装备进入栏位；不用于局内滚轮切枪。机械式候选会比纯拿取更强调机件。  | [Gary / fossilrecords.net（qubodup 发布） / 45ACP_slide.wav](https://opengameart.org/content/handling-guns) |
| W5 | 轻金属 · 入栏确认 | 仅用于从容器装备进入栏位；不用于局内滚轮切枪。机械式候选会比纯拿取更强调机件。  | [artisticdude / inventory/metal-small2.wav](https://opengameart.org/content/rpg-sound-pack) |
| A1 | 皮革护具 · 柔韧摩擦 | 保留材料本身的音色，不用切枪声代替穿戴。 A1 适合偏柔和风格；A2 更像游戏中短促的装备确认。 | [artisticdude（Ogrebane 发布） / leather_inventory.wav](https://opengameart.org/content/inventory-sound-effects) |
| A2 | 轻护甲 · 扣合 | 保留材料本身的音色，不用切枪声代替穿戴。 A1 适合偏柔和风格；A2 更像游戏中短促的装备确认。 | [artisticdude / inventory/armor-light.wav](https://opengameart.org/content/rpg-sound-pack) |
| A3 | 布制服装 · 穿上 | 保留材料本身的音色，不用切枪声代替穿戴。  | [artisticdude（Ogrebane 发布） / cloth-inventory.wav](https://opengameart.org/content/inventory-sound-effects) |
| A4 | 魔术贴 · 固定护具 | 保留材料本身的音色，不用切枪声代替穿戴。  | [OwlishMedia / Velcro/Velcro_03.wav](https://opengameart.org/content/202-more-sound-effects) |
| A5 | 拉链 · 收紧装备 | 保留材料本身的音色，不用切枪声代替穿戴。  | [Jason Steele / FilmCow / zipper 7.wav](https://filmcow.itch.io/filmcow-sfx) |
| S1 | 清脆咀嚼 | 小鱼干：以咬、嚼为主，不附加魔法或打嗝。 S1 / S2 的原条目下载量较高，动作也最直观。 | [Mike Koenig / Eating Chips](https://soundbible.com/402-Eating-Chips.html) |
| S2 | 连续小口嚼 | 小鱼干：以咬、嚼为主，不附加魔法或打嗝。 S1 / S2 的原条目下载量较高，动作也最直观。 | [Caroline Ford / Eat Chips](https://soundbible.com/912-Eat-Chips.html) |
| S3 | 游戏式一口脆 | 小鱼干：以咬、嚼为主，不附加魔法或打嗝。  | [Tito / StarNinjas / crunch.3.ogg](https://opengameart.org/content/7-eating-crunches) |
| S4 | 干粮脆咬 | 小鱼干：以咬、嚼为主，不附加魔法或打嗝。  | [Joseph SARDIN / eat-a-rusk](https://bigsoundbank.com/eat-a-rusk-s0407.html) |
| S5 | 猫咪真实进食 | 小鱼干：以咬、嚼为主，不附加魔法或打嗝。  | [Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx) |
| L1 | 圆润舔食 · 设计原声 | 舔食与软食候选；前两条是原作者轻度设计的舔食，后三条为自然嘴部/猫进食录音。 L1 更接近明确的舔食轮廓；L3 保留真猫进食质感。 | [DenisChardonnet / licking-1](https://bigsoundbank.com/licking-1-s0238.html) |
| L2 | 短促舔食 · 设计原声 | 舔食与软食候选；前两条是原作者轻度设计的舔食，后三条为自然嘴部/猫进食录音。  | [DenisChardonnet / licking-2](https://bigsoundbank.com/licking-2-s0239.html) |
| L3 | 猫咪舔嚼 · 实录 | 舔食与软食候选；前两条是原作者轻度设计的舔食，后三条为自然嘴部/猫进食录音。 L1 更接近明确的舔食轮廓；L3 保留真猫进食质感。 | [Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx) |
| L4 | 嘴唇小口动作 | 舔食与软食候选；前两条是原作者轻度设计的舔食，后三条为自然嘴部/猫进食录音。  | [DavidGreck / mouth-noises-1](https://bigsoundbank.com/mouth-noises-1-s0352.html) |
| L5 | 软食抿嘴动作 | 舔食与软食候选；前两条是原作者轻度设计的舔食，后三条为自然嘴部/猫进食录音。  | [DavidGreck / mouth-noises-2](https://bigsoundbank.com/mouth-noises-2-s0353.html) |
| D1 | 轻饮两口 | 液体饮用；恢复在食用完成后按游戏既定规则持续生效，声音不循环播放十几秒。 D1 / D2 优先比较，两种录音来源与吞咽节奏不同。 | [Jason Steele / FilmCow / drinking and swallowing 2.wav](https://filmcow.itch.io/filmcow-sfx) |
| D2 | 自然饮水吞咽 | 液体饮用；恢复在食用完成后按游戏既定规则持续生效，声音不循环播放十几秒。 D1 / D2 优先比较，两种录音来源与吞咽节奏不同。 | [OwlishMedia / Drink/Drink_05.wav](https://opengameart.org/content/202-more-sound-effects) |
| D3 | 清楚的吞咽 | 液体饮用；恢复在食用完成后按游戏既定规则持续生效，声音不循环播放十几秒。  | [Iwan ‘qubodup’ Gabovitch / swallow-05.flac](https://opengameart.org/content/liquid-bottle-drink-set)；[Iwan ‘qubodup’ Gabovitch / swallow-01.flac](https://opengameart.org/content/liquid-bottle-drink-set) |
| D4 | 连续小口饮用 | 液体饮用；恢复在食用完成后按游戏既定规则持续生效，声音不循环播放十几秒。  | [Jason Steele / FilmCow / drinking and swallowing 3.wav](https://filmcow.itch.io/filmcow-sfx) |
| D5 | 短口喝水 | 液体饮用；恢复在食用完成后按游戏既定规则持续生效，声音不循环播放十几秒。  | [OwlishMedia / Drink/Drink_01.wav](https://opengameart.org/content/202-more-sound-effects)；[Iwan ‘qubodup’ Gabovitch / swallow-01.flac](https://opengameart.org/content/liquid-bottle-drink-set) |
| C1 | 拉环＋自然咀嚼 | 开罐后再吃，最后低音量立即恢复点缀。开罐录音来自饮料拉环，已避开长喷气段；不是鱼罐头现场实录。 C1 / C2 优先：开罐与进食先后最清晰。 | [KP / Open Soda Can](https://soundbible.com/1659-Open-Soda-Can.html)；[Caroline Ford / Eating](https://soundbible.com/976-Eating.html)；[artisticdude / inventory/bubble.wav](https://opengameart.org/content/rpg-sound-pack) |
| C2 | 金属拉环＋猫咪吃罐 | 开罐后再吃，最后低音量立即恢复点缀。开罐录音来自饮料拉环，已避开长喷气段；不是鱼罐头现场实录。 C1 / C2 优先：开罐与进食先后最清晰。 | [Mike Koenig / Beer Can Opening](https://soundbible.com/216-Beer-Can-Opening.html)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[leohpaz / 02_Heal_02.wav](https://opengameart.org/content/8-heals-and-buffs-sfx) |
| C3 | 开盖＋细嚼 | 开罐后再吃，最后低音量立即恢复点缀。开罐录音来自饮料拉环，已避开长喷气段；不是鱼罐头现场实录。  | [KP / Open Soda Can](https://soundbible.com/1659-Open-Soda-Can.html)；[Caroline Ford / Eat Chips](https://soundbible.com/912-Eat-Chips.html)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| C4 | 短拉环＋软食 | 开罐后再吃，最后低音量立即恢复点缀。开罐录音来自饮料拉环，已避开长喷气段；不是鱼罐头现场实录。  | [Mike Koenig / Beer Can Opening](https://soundbible.com/216-Beer-Can-Opening.html)；[DavidGreck / mouth-noises-1](https://bigsoundbank.com/mouth-noises-1-s0352.html)；[DoKashiteru / healspell2.aif](https://opengameart.org/content/3-heal-spells) |
| C5 | 开罐＋猫咪连吃 | 开罐后再吃，最后低音量立即恢复点缀。开罐录音来自饮料拉环，已避开长喷气段；不是鱼罐头现场实录。  | [KP / Open Soda Can](https://soundbible.com/1659-Open-Soda-Can.html)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |
| F1 | 薯条 · 清脆咀嚼 | 突出脆咬与即时恢复，不加持续恢复尾声。  | [Jason Steele / FilmCow / bag of tortilla chips 3.wav](https://filmcow.itch.io/filmcow-sfx)；[Mike Koenig / Eating Chips](https://soundbible.com/402-Eating-Chips.html)；[artisticdude / inventory/bubble.wav](https://opengameart.org/content/rpg-sound-pack) |
| F2 | 薯条 · 连续小口嚼 | 突出脆咬与即时恢复，不加持续恢复尾声。  | [Jason Steele / FilmCow / bag of tortilla chips 6.wav](https://filmcow.itch.io/filmcow-sfx)；[Caroline Ford / Eat Chips](https://soundbible.com/912-Eat-Chips.html)；[leohpaz / 02_Heal_02.wav](https://opengameart.org/content/8-heals-and-buffs-sfx) |
| F3 | 薯条 · 游戏式一口脆 | 突出脆咬与即时恢复，不加持续恢复尾声。  | [Jason Steele / FilmCow / bag of tortilla chips 3.wav](https://filmcow.itch.io/filmcow-sfx)；[Tito / StarNinjas / crunch.3.ogg](https://opengameart.org/content/7-eating-crunches)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| F4 | 薯条 · 干粮脆咬 | 突出脆咬与即时恢复，不加持续恢复尾声。  | [Jason Steele / FilmCow / bag of tortilla chips 6.wav](https://filmcow.itch.io/filmcow-sfx)；[Joseph SARDIN / eat-a-rusk](https://bigsoundbank.com/eat-a-rusk-s0407.html)；[DoKashiteru / healspell2.aif](https://opengameart.org/content/3-heal-spells) |
| F5 | 薯条 · 猫咪真实进食 | 突出脆咬与即时恢复，不加持续恢复尾声。  | [Jason Steele / FilmCow / bag of tortilla chips 3.wav](https://filmcow.itch.io/filmcow-sfx)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |
| M1 | 餐盒＋软嚼 | 三级组合恢复：先短促完成提示，再轻柔启动尾声；只作音效区别，不修改恢复数值。  | [Jason Steele / FilmCow / box of cereal handled 4.wav](https://filmcow.itch.io/filmcow-sfx)；[Caroline Ford / Eating](https://soundbible.com/976-Eating.html)；[artisticdude / inventory/bubble.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |
| M2 | 餐盒＋猫咪咀嚼 | 三级组合恢复：先短促完成提示，再轻柔启动尾声；只作音效区别，不修改恢复数值。  | [OwlishMedia / Plastic/Plastic_06.wav](https://opengameart.org/content/202-more-sound-effects)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[leohpaz / 02_Heal_02.wav](https://opengameart.org/content/8-heals-and-buffs-sfx)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| M3 | 纸盒＋小口吃 | 三级组合恢复：先短促完成提示，再轻柔启动尾声；只作音效区别，不修改恢复数值。  | [Jason Steele / FilmCow / box of cereal handled 4.wav](https://filmcow.itch.io/filmcow-sfx)；[Caroline Ford / Eat Chips](https://soundbible.com/912-Eat-Chips.html)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |
| M4 | 轻包装＋抿食 | 三级组合恢复：先短促完成提示，再轻柔启动尾声；只作音效区别，不修改恢复数值。  | [OwlishMedia / Plastic/Plastic_06.wav](https://opengameart.org/content/202-more-sound-effects)；[DavidGreck / mouth-noises-1](https://bigsoundbank.com/mouth-noises-1-s0352.html)；[DoKashiteru / healspell2.aif](https://opengameart.org/content/3-heal-spells)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| M5 | 包装＋连吃 | 三级组合恢复：先短促完成提示，再轻柔启动尾声；只作音效区别，不修改恢复数值。  | [Jason Steele / FilmCow / box of cereal handled 4.wav](https://filmcow.itch.io/filmcow-sfx)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |
| N1 | 清晰连续吸溜＋短嗝 | 真实吸食录音设计的吃面节奏＋真实短打嗝。原吸食多为吸管录音，不冒充实录吃面；原声均可单独听。 N1 / N2 优先；五组使用不同吸食原录音，并有不同打嗝结尾。 | [Mike Koenig / Straw Slurp Normal](https://soundbible.com/856-Straw-Slurp-Normal.html)；[Mike Koenig / Short Male Burp](https://soundbible.com/1867-Short-Male-Burp.html)；[artisticdude / inventory/bubble.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| N2 | 较饱满的吸溜＋短嗝 | 真实吸食录音设计的吃面节奏＋真实短打嗝。原吸食多为吸管录音，不冒充实录吃面；原声均可单独听。 N1 / N2 优先；五组使用不同吸食原录音，并有不同打嗝结尾。 | [Mike Koenig / Straw Slurp](https://soundbible.com/860-Straw-Slurp.html)；[Kevan / Belch](https://soundbible.com/1579-Belch.html)；[leohpaz / 02_Heal_02.wav](https://opengameart.org/content/8-heals-and-buffs-sfx)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| N3 | 较细的吸溜＋短嗝 | 真实吸食录音设计的吃面节奏＋真实短打嗝。原吸食多为吸管录音，不冒充实录吃面；原声均可单独听。  | [Mike Koenig / Straw Slurp 3](https://soundbible.com/842-Straw-Slurp-3.html)；[artisticdude / misc/burp.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| N4 | 清楚吸食纹理＋短嗝 | 真实吸食录音设计的吃面节奏＋真实短打嗝。原吸食多为吸管录音，不冒充实录吃面；原声均可单独听。  | [Joseph SARDIN / straw-suction-1](https://bigsoundbank.com/straw-suction-1-s1244.html)；[Mike Koenig / Burp 2x](https://soundbible.com/645-Burp-2x.html)；[DoKashiteru / healspell2.aif](https://opengameart.org/content/3-heal-spells)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| N5 | 短促分段吸食＋短嗝 | 真实吸食录音设计的吃面节奏＋真实短打嗝。原吸食多为吸管录音，不冒充实录吃面；原声均可单独听。  | [Joseph SARDIN / straw-suction-2](https://bigsoundbank.com/straw-suction-2-s1245.html)；[Mike Koenig / Burp 2x](https://soundbible.com/645-Burp-2x.html)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| H1 | 大口嚼＋满足短嗝 | 1.2 秒内保留多口进食和短打嗝，只取短促结尾，不把食用时长拉长或修改食物数值。  | [Caroline Ford / Eating](https://soundbible.com/976-Eating.html)；[Mike Koenig / Eating Chips](https://soundbible.com/402-Eating-Chips.html)；[Mike Koenig / Short Male Burp](https://soundbible.com/1867-Short-Male-Burp.html)；[artisticdude / inventory/bubble.wav](https://opengameart.org/content/rpg-sound-pack) |
| H2 | 猫咪连吃＋短嗝 | 1.2 秒内保留多口进食和短打嗝，只取短促结尾，不把食用时长拉长或修改食物数值。  | [Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[Kevan / Belch](https://soundbible.com/1579-Belch.html)；[leohpaz / 02_Heal_02.wav](https://opengameart.org/content/8-heals-and-buffs-sfx) |
| H3 | 清楚咀嚼＋短嗝 | 1.2 秒内保留多口进食和短打嗝，只取短促结尾，不把食用时长拉长或修改食物数值。  | [Caroline Ford / Eat Chips](https://soundbible.com/912-Eat-Chips.html)；[Mike Koenig / Eating Chips](https://soundbible.com/402-Eating-Chips.html)；[artisticdude / misc/burp.wav](https://opengameart.org/content/rpg-sound-pack)；[artisticdude / inventory/bubble2.wav](https://opengameart.org/content/rpg-sound-pack) |
| H4 | 软嚼加一口＋短嗝 | 1.2 秒内保留多口进食和短打嗝，只取短促结尾，不把食用时长拉长或修改食物数值。  | [DavidGreck / mouth-noises-1](https://bigsoundbank.com/mouth-noises-1-s0352.html)；[Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[Mike Koenig / Burp 2x](https://soundbible.com/645-Burp-2x.html)；[DoKashiteru / healspell2.aif](https://opengameart.org/content/3-heal-spells) |
| H5 | 猫咪大餐＋短嗝 | 1.2 秒内保留多口进食和短打嗝，只取短促结尾，不把食用时长拉长或修改食物数值。  | [Jason Steele / FilmCow / cat eating.wav](https://filmcow.itch.io/filmcow-sfx)；[Mike Koenig / Eating Chips](https://soundbible.com/402-Eating-Chips.html)；[Mike Koenig / Burp 2x](https://soundbible.com/645-Burp-2x.html)；[artisticdude / inventory/bubble3.wav](https://opengameart.org/content/rpg-sound-pack) |

## 处理、时序与可复现性

- 保留完整原声参考，逐项记录原文件哈希、源包哈希、下载 URL、包内成员名、作者和许可；原声仅无损转 FLAC，若解码越过满幅则固定衰减防止转码削波。播放器音量初值 100%。
- 组合只做固定音量匹配、明确剪切、顺序拼接/轻度叠加与 4 毫秒剪切边缘防咔哒。无 EQ、变调、混响、压缩、限幅、程序合成或离线时间拉伸。
- 各组件先按活动 RMS 做固定增益匹配，峰值预留余量；组合后再一次固定增益匹配，峰值不超过 0.88。不是动态压缩或限幅，主试听控制仍为 100%。
- 翻滚 0.35 秒内是摩擦/翻身，落地在后段，尾音到 0.43 秒；进食全部按现用食物时长固定，打嗝放在吃完后。
- 换弹默认原速，另可选 1.5 / 2.5 / 3.5 秒同步试听；仅在播放器按 `buffer.duration / 目标时长` 改变播放速度。原速按钮保留，不会覆盖原文件。
- R4、R5 含 Gary 的 CC BY-SA 3.0 改编，W4 同样；W3 保留 Q009 许可，明确提供 CC BY-SA 3.0 组合许可。其他组件逐项保留 CC0、CC BY 3.0/4.0 或 FilmCow 自定义许可。
- `public/audio-review/actions/licenses/` 保留许可全文、原 FilmCow PDF、Gary 操作时间表及 Q009 原声明，公开清单和页面含署名与变更说明。

配方：`scripts/assets/action-audio-sources.json`；构建：`python scripts/assets/build-action-audio-review.py --cache /tmp/audio-actions-research`。需要 ffmpeg、ffprobe、NumPy，若从 7z 缓存重建还需要 py7zr。源包在缓存，不将近 1GB 的 FilmCow 整包提交仓库；配方固定成员名与哈希。发布清单 `public/audio-review/actions/manifest-v1.json` 包含每条裁剪的源起止、排布位置、固定增益与成品 SHA-256。

## 针对本轮的验证

- 真实 Chrome：12 类各 5 个候选；70 个时长版本、25 个纯食物版本与 60 个完整原声，共 155 个 FLAC 全部成功解码，声道/时长与清单一致。
- 单条、互斥停止、连听/中断、原声播放、默认满音量、换弹同步时长、恢复点缀开关、食物时长切换、选择清单导出与 Esc 关闭通过。
- 390 像素手机与桌面截图检查，控件和文字清楚，选择弹窗可见，无横向溢出；不写游戏存档或 localStorage。
- 源码检查：`src/` 与既有音频清单没有改变。生产构建和公开站点只做相关版本/资源校验，不执行全量游戏测试。

核验快照：2026-10-21（Asia/Shanghai）。
