# 已采用的交互音效（2026-10-22）

按用户最后给出的编号跨类别选用，不以候选所属分类替代其明确选择。四级食物的动作也统一为3秒，已由用户确认。只有本页所列选择接入游戏；新一轮换弹、轻量搜索、受击猫叫和敌人警戒猫叫保持待选。

| 游戏用途/文件键 | 最终选择 | 长度 | 响度 LUFS | 修改 |
| --- | --- | --- | --- | --- |
| 第一刀 / `melee-first` | KN1 | 0.095s | -30.05 | 只匹配固定音量，不改原速 |
| 第二刀 / `melee-second` | KN2 | 0.410s | -30.05 | 只匹配固定音量，不改原速 |
| 切刀 / `switch-melee` | KN3 | 0.300s | -30.03 | asetrate=44100*1.3666666667,aresample=44100,apad=whole_dur=0.3,atrim=duration=0.3 |
| open-box / `open-box` | BX1 | 1.110s | -29.98 | 只匹配固定音量，不改原速 |
| open-toolbox / `open-toolbox` | TB2 | 1.010s | -29.97 | 只匹配固定音量，不改原速 |
| 乡间保温箱 / `open-cooler` | TB1 | 0.660s | -30.02 | 只匹配固定音量，不改原速 |
| open-trashcan / `open-trashcan` | GB1 | 0.368s | -30.05 | 只匹配固定音量，不改原速 |
| open-basket / `open-basket` | NW5 | 0.184s | -30.05 | 只匹配固定音量，不改原速 |
| open-litter / `open-litter` | LT4 | 0.766s | -29.99 | 只匹配固定音量，不改原速 |
| open-cabinet / `open-cabinet` | CB5 | 0.988s | -29.99 | 只匹配固定音量，不改原速 |
| open-medical / `open-medical` | MD2 | 0.810s | -29.96 | 只匹配固定音量，不改原速 |
| open-weapon / `open-weapon` | WX4 | 0.390s | -30.05 | 只匹配固定音量，不改原速 |
| open-bed / `open-bed` | BD1 | 0.860s | -30.02 | 只匹配固定音量，不改原速 |
| open-safe / `open-safe` | SF5 | 1.102s | -29.99 | 只匹配固定音量，不改原速 |
| 普通及Boss战利品盒 / `open-corpse` | BL2 | 0.309s | -29.99 | 只匹配固定音量，不改原速 |
| 珍贵发现 / `discover-3` | D12-1 | 0.687s | -29.96 | 只匹配固定音量，不改原速 |
| 稀世发现 / `discover-4` | D4-3 | 1.566s | -30.01 | 只匹配固定音量，不改原速 |
| 传说发现 / `discover-5` | D5-3 | 2.506s | -30.01 | 只匹配固定音量，不改原速 |
| 装入背包 / `pack` | PK4 | 0.278s | -29.98 | 只匹配固定音量，不改原速 |
| 薯四与快乐餐盒 / `food-fries` | Eating Chips | 1.800s | -30.01 | atrim=start=0:end=1.8,asetpts=PTS-STARTPTS |
| 海鲜拼盘与鱼面 / `food-tier4` | mouth-noises-1 | 3.000s | -29.99 | asetrate=44100*1.6108843333,aresample=44100,apad=whole_dur=3,atrim=duration=3 |

## 行为与明确的交叉选择

- 两刀与现有 `meleeSwing` 序号对应：第一刀KN1、第二刀KN2，再交替；切刀使用KN3（加速至0.3秒），不会把切刀当作挥刀计数。
- 切枪使用当前W4装备武器音源，与从容器装备枪械一致；重复选择当前栏位不重复播放。此项用户最新授权取代“切枪保持安静”的旧约定。
- 保温箱选TB1，不是CL；生锈工具盒选TB2。普通及Boss盒都选BL2，游戏中二者类型均为corpse。保留视觉上的Boss区别。
- 每个场景容器首次打开时播放对应开盖声；再次查看已打开或空容器不重复模拟开盖。未删除原有轻短搜索声，新循环搜索待选。
- 1、2级揭示保留原合成音；3级明确选D12-1，4级D4-3，5级D5-3。在实际逐件揭示时播放，不是在发现收藏提示出现时重复播放。
- 成功从容器放入背包/安全箱用PK4；空间不足或无效拾取不播放。直接装备仍使用此前W4/A3装备声。
- 薯四与快乐餐盒都用Mike Koenig的 Eating Chips 原声前1.8秒，与当前进食时长一致；没有包装打开的组件。
- 两种四级食物统一DavidGreck的完整 mouth-noises-1，4.833秒原音按用户要求加速至3秒；动作时长也统一3秒，恢复量与持续恢复效果不变。不添加尚未选定的嗝。
- 进食开始播放，攻击和翻滚取消，数量未完成前不消耗；行走、疾跑和被攻击仍按原机制。

## 音量与文件处理

21条成品均用单一固定增益匹配到约-30 LUFS，实测范围-30.05至-29.96，真峰值不超过-1 dBTP，与上一轮已采用动作相近、比现用枪声约低1.6dB。短于400毫秒的声音无法直接产生有效的R128积分读数，因此**仅测量阶段补足1秒静音**，输出并未补长；元数据保留原实际长度。使用ffmpeg loudnorm只读测量值，实际处理为volume固定增益，没有动态归一、压缩或限幅。

除两处明确要求加速和Eating Chips指定动作内剪切外，没有新EQ、变调、混响或声音叠加。原试听已披露的4毫秒剪切防咔哒仍保留。枪声和所有换弹文件的SHA-256均与上一版一致。

## 来源与许可

逐条原作者、原页、原文件哈希、最终哈希、剪切与增益见 `src/assets/audio/approved-interactions.json`；对应试听原件在 `public/audio-review/interactions/` 或 `actions/`。保留CC0、CC BY3/4、FilmCow专用许可和Gary的CC BY-SA3相关义务。新采用来源概览：

| 素材 | 作者 | 来源 | 许可 |
| --- | --- | --- | --- |
| swish-2.wav | artisticdude | [原发行页](https://opengameart.org/content/swishes-sound-pack) | CC0-1.0 |
| sword sound.wav | remaxim / Iwan ‘qubodup’ Gabovitch | [原发行页](https://opengameart.org/content/3-melee-sounds) | CC0-1.0 |
| sword.3.ogg | StarNinjas | [原发行页](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) | CC0-1.0 |
| cardboard box open 1.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| Metal box lid | Joseph SARDIN | [原发行页](https://bigsoundbank.com/metal-box-lid-s0053.html) | CC0-1.0 |
| metal latch 1.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| plastic panel open 4.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| wood_cracking_01.ogg | rubberduck | [原发行页](https://opengameart.org/content/100-cc0-metal-and-wood-sfx) | CC0-1.0 |
| container of nuts 3.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| Wooden drawer, opening | Joseph SARDIN | [原发行页](https://bigsoundbank.com/wooden-drawer-opening-s1499.html) | CC0-1.0 |
| Zipper #2 | DenisChardonnet | [原发行页](https://bigsoundbank.com/zipper-2-s0270.html) | CC0-1.0 |
| lock_01.ogg | rubberduck | [原发行页](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0-1.0 |
| clothes ruffle 3.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| wood and metal cabinet opened 4.wav | Jason Steele / FilmCow | [原发行页](https://filmcow.itch.io/filmcow-sfx) | FilmCow Royalty Free SFX License |
| lock_03.ogg | rubberduck | [原发行页](https://opengameart.org/content/80-cc0-rpg-sfx) | CC0-1.0 |
| completion-sound-completetask_0.mp3 | Brandon Morris / HaelDB | [原发行页](https://opengameart.org/content/completion-sound) | CC0-1.0 |
| Rise03.aif | WobbleBoxx Workshop | [原发行页](https://opengameart.org/content/level-up-power-up-coin-get-13-sounds) | CC0-1.0 |
| Rise07.aif | WobbleBoxx Workshop | [原发行页](https://opengameart.org/content/level-up-power-up-coin-get-13-sounds) | CC0-1.0 |
| qubodupItemHandling4.wav | Iwan ‘qubodup’ Gabovitch | [原发行页](https://opengameart.org/content/item-handling) | CC-BY-3.0 |
| Eating Chips | Mike Koenig | [原发行页](https://soundbible.com/402-Eating-Chips.html) | CC-BY-3.0 |
| mouth-noises-1 | DavidGreck | [原发行页](https://bigsoundbank.com/mouth-noises-1-s0352.html) | CC0-1.0 |

## 复现与验证

`python scripts/assets/install-approved-interactions.py` 从仓库已固定的试听文件重建，先校验来源SHA-256。旧 `install-approved-actions.py` 结束时会重放本轮选择，避免恢复旧F1包装声；枪械构建器保留本轮元数据和音频。

已通过10项音频相关单元测试；Chrome实际解码38个游戏音源、十种食物时长和取消、原四类枪械/换弹、实际容器开盖与逐件揭示及拾取、两刀交替与切枪切刀。新试听页另作专项测试。没有执行无关的全量地图/战斗回归。
