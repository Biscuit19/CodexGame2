# 开始菜单、基地身份栏与出发准备（2026-11-17）

接手基线：ce3e64279321c98e8ab39fecd2edce5d6b18019a；work 与远程 main 一致，开始时工作区干净。

## 当前实现依据

- 根 AGENTS.md 是覆盖顺序入口；仓库未发现下级 AGENTS.md。
- 世界观以 GAME_DESIGN.md 第2节为依据：爪洲群岛、三角猫特勤局、暖窝基地、三花七号搜寻物资。早期玩法表不是待办。
- UI_HOMESTEAD_REDESIGN / UI_COUNTRYSIDE_POLISH：前者负责开始与基地，后者负责通用UI。本轮在 homestead.css 替换相关规则；旧全局 selected 背景排除 map-card，避免强制背景覆盖新选中态。
- TESTING：只选相关 Chrome 流程，构建包含类型检查；发布只验证版本与资源。
- GAME_WORKBENCH 与 tuning-plugin：读取真实源码和运行时物品；本轮不修改数值或音量配置。
- BALANCE_REFINEMENT、COMBAT_PRESSURE_ECONOMY_MUSIC、MAP_RESOURCE_NOTICES、MAP1_COUNTRYSIDE：后续覆盖前文的环射、移速、音乐默认、容器和撤离位置。核实实际地图7000×5500、Boss计时倍率1.2、默认音乐随机。
- AUDIO_DESIGN / SELECTED / APPROVED_ACTIONS / APPROVED_INTERACTIONS / APPROVED_FEEDBACK / APPROVED_MUSIC / RAID_MUSIC_DISCOVERY / COMMERCE_MIXER：采用链按时间覆盖。最终音量以 audio-balance.json 为准，基地SC6、战区SC1；REVIEW文档只表示候选历史，不能整体接入。
- IMPLEMENTATION、WEAPONS 等历史文件仍包含旧价格、合成音、全量CI描述；这些不覆盖实际源码和较新约定。
- src/assets/village/README.md 记录 Tiny Treats、KayKit 固定来源与CC0许可；icons/README.md记录原生成图集。本轮不替换它们。

## 设计与素材

开始菜单删除指定宣传文案、句号、编号和英文装饰，使用文字导航、菱形焦点、短距离反馈。开始页图片为本轮图像工具生成的原创乡野插画，本地文件 src/assets/title-countryside.png；未复制其他游戏素材。简洁三花猫在木桥旁搜寻箱子，普通木屋、谷仓、农田，克制平涂，无电影光效或精细毛发。基地原插画保持原有页面用途。

出发准备以地图导航、选中状态、区域信息、真实限时和撤离费用、首领进度、模式和行动按钮分层。锁定地图可查看但不能出发；沿用原部署检查和模式规则。切换地图重绘后恢复按钮焦点。

基地身份栏保留品牌返回、玩家、模式、金币、设置、返回和仓库出发接口，小屏换行而不隐藏身份。减少动态效果覆盖三个界面。

## 联网参考的实际范围

尝试以 Firewatch、Hollow Knight、Disco Elysium 搜索 Game UI Database，并尝试 Interface In Game 的 Firewatch / Hollow Knight 页面，均返回 HTTP 403。Firewatch 官网也403；Hollow Knight 官网与Google搜索返回200，但不能据此声称已查看这些游戏的菜单截图。未取得足够可核对的菜单图，因此“热门单机菜单截图比较”仍未完成；本轮布局采用项目自身需求，没有复制参考游戏资源。

## 验证记录

首次构建通过。首轮两项 homestead Chrome 用例通过；两项 preflight 在30秒预算下超时，其中一次受开发服务文件更新重载影响。后续停止编辑后独立复测，结果以本轮最终记录为准。实际截图发现并修复选中地图背景、标题和次级文字对比度问题。

最终功能验证：使用 Google Chrome 157.0.8103.78，homestead-redesign 两项、departure-layout 一项、preflight-transition 两项合计5项通过。初始30秒超时后，按软件渲染耗时使用90秒预算，无禁用断言或自动重试。截图实际查看开始、新游戏、设置、基地、640窄屏、出发准备及进战区后的背包。最后标题选择器修复仅重跑 departure-layout，另做最终类型检查与生产构建。未运行无关单元或全量浏览器测试。
