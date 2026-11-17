# 项目文档索引

较新覆盖规则以 AGENTS.md 为入口，历史计划不视为未完成任务。

| 文件 | 标题 |
| --- | --- |
| `README.md` | 三角猫行动 · Operation Tri-Cat |
| `GAME_DESIGN.md` | 《三角猫行动》游戏设计需求文档 |
| `docs/ART_DIRECTION.md` | 游戏设计要求包括如下： |
| `docs/AUDIO_ACTION_REVIEW.md` | 动作与进食音效试听（待用户选择） |
| `docs/AUDIO_APPROVED_ACTIONS.md` | 已采用的动作与进食音效 |
| `docs/AUDIO_APPROVED_FEEDBACK.md` | 已采用：换弹、猫叫、发现与入包（2026-10-22） |
| `docs/AUDIO_APPROVED_INTERACTIONS.md` | 已采用的交互音效（2026-10-22） |
| `docs/AUDIO_APPROVED_MUSIC.md` | 最新采用：步枪、四级发现与音乐（2026-10-22） |
| `docs/AUDIO_COMMERCE_MIXER.md` | 交易采用、首次解锁保护与全音效调音台 |
| `docs/AUDIO_COMMERCE_REVIEW.md` | 购买、售卖、丢弃、UI点击试听（2026-10-23） |
| `docs/AUDIO_DESIGN.md` | 当前状态（2026-10-23） |
| `docs/AUDIO_DISCOVERY_MUSIC_REVIEW.md` | 新发现音效与完整音乐试听（2026-10-22） |
| `docs/AUDIO_INTERACTION_REVIEW.md` | 搜索、容器与四级食物音效候选 |
| `docs/AUDIO_RAID_MUSIC_DISCOVERY.md` | 最新音乐、发现与换弹动作（2026-10-23） |
| `docs/AUDIO_RELOAD_SEARCH_CATS.md` | 换弹、轻量搜索与猫叫 · 40个待选候选 |
| `docs/AUDIO_REVIEW.md` | 第二轮音效选材：五位作者的原声候选 |
| `docs/AUDIO_SELECTED.md` | 已接入游戏的枪声与换弹 |
| `docs/AUDIO_SHOTS_MUSIC_REVIEW.md` | 新枪声与完整背景音乐试听（2026-10-22） |
| `docs/AUDIO_SOFT_CLICKS.md` | 柔软UI点击试听 |
| `docs/BALANCE_REFINEMENT.md` | 2026-10-31 音乐、配装与战斗手感调整 |
| `docs/BASE_GAME_MUSIC_AND_REVIEW.md` | 基地／游戏音乐分开与20首静谧候选（2026-10-30） |
| `docs/COLLECTIBLES.md` | 收集品与补给 |
| `docs/COMBAT_PRESSURE_ECONOMY_MUSIC.md` | 音乐采用、战斗压力和经济修订（2026-10-30） |
| `docs/GAME_WORKBENCH.md` | 游戏数值与声音调整台 |
| `docs/IMPLEMENTATION.md` | 实现与验收说明 |
| `docs/MAP1_COUNTRYSIDE.md` | 地图一：猫尾乡野 |
| `docs/MAP_RESOURCE_NOTICES.md` | 2026-11-03 乡野资源、地图图例与提示统一 |
| `docs/SEARCH_INVENTORY_COMBAT_BALANCE.md` | 搜索背包与战斗平衡调整（2026-10-27） |
| `docs/TESTING.md` | 测试策略与完整回归清单 |
| `docs/UI_COUNTRYSIDE_POLISH.md` | 2026-11-06 温润乡野 UI 与战斗反馈 |
| `docs/UI_DEPARTURE_REFINEMENT.md` | 开始菜单、基地身份栏与出发准备（2026-11-17） |
| `docs/UI_HOMESTEAD_REDESIGN.md` | 开始页与基地：完整重设计 |
| `docs/VILLAGE_ENEMY_TACTICS.md` | 猫尾乡野：敌人战术与地图阅读（2026-10-30） |
| `docs/WAREHOUSE_AUDIO_TRANSFER.md` | 仓库快捷转移与点击声音 |
| `docs/WEAPONS.md` | 枪械配置与平衡说明 |

构建与部署：package.json、vite.config.ts、.github/workflows/pages.yml、scripts/sw.mjs、scripts/check-published.mjs。

数值与素材：scripts/tuning-plugin.mjs、scripts/apply-game-config.mjs、scripts/assets/ 下各生成与已批准安装脚本；src/assets/village/README.md、src/assets/icons/README.md、src/assets/audio/README.md。

本轮测试：tests/browser/homestead-redesign.spec.ts、preflight-transition.spec.ts、departure-layout.spec.ts；测试状态通过 __game 准备，不改正式用户存档。
