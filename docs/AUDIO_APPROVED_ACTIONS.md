# 已采用的动作与进食音效

2026-10-21：按用户选择接入游戏。新一轮四级食物、换弹、挥刀、容器、搜索、发现与装包候选仍待选择。

| 游戏动作/物品 | 采用候选 | 食用/动作秒数 | 实测 LUFS |
| --- | --- | --- | --- |
| roll | T4 / roll | 0.43 | -30.05 |
| equip-weapon | W4 / equip | 0.5 | -30.05 |
| equip-gear | A3 / equip | 0.679002 | -29.99 |
| food-fish | S4 / fish | 1.0 | -30.0 |
| food-paste | L4 / paste | 1.4 | -29.99 |
| food-ice | L4 / ice | 1.2 | -30.01 |
| food-water | D5 / water | 1.0 | -30.01 |
| food-milk | D5 / milk | 1.4 | -30.63 |
| food-can | C1 / can | 2.0 | -30.0 |
| food-fries | F1 / fries | 1.8 | -29.98 |

猫条/冰淇淋共用 L4，保留 1.4 / 1.2 秒版本。矿泉水/六个核爪共用 D5，保留 1 / 1.4 秒版本。薯四与快乐餐盒共用 F1，均 1.8 秒。其他食物声音暂不改变。

组件间继续采用原试听的固定音量匹配，食物前景和较轻的恢复点缀关系保留；成品用单一固定增益归一到约 -30 LUFS，与当前枪声的 -28.4 LUFS 相差约 1.6 dB。核爪短片段因 R128 门限窗口量化为 -30.63，其余为 -29.98 到 -30.05，最大差约 0.65 LU。峰值不超过 -1 dBTP。没有为强行匹配仪表加入压缩/限幅/变调/滤波。

进食开始即播放对应录音，按该食物时长匹配。攻击、翻滚打断进食时停止声音，也使异步首播失效；走路、疾跑和普通搜索中断不停止。选定食物不额外叠加旧的通用回血声。未选的四级食物仍保留旧完成音。枪声、换弹、挥刀源文件字节保持不变，局内切枪安静。

各源作者、许可、精确剪切/拼接及原始哈希见 [动作试听对照](AUDIO_ACTION_REVIEW.md) 和 `src/assets/audio/approved-actions.json`。W4 是 Gary / fossilrecords.net 原录音的改编，按 CC BY-SA 3.0 提供；A3 署名 artisticdude / Ogrebane（CC BY 3.0）；FilmCow 的自定义免版税许可适用于 T4 / F1 的相应组件，非 CC0。公开署名页 `public/audio-credits.html` 已同步。

复现：`python scripts/assets/install-approved-actions.py`。该脚本只读取仓库中被选定的试听成品，校验哈希后应用固定响度增益；不重新合成或修改枪声。`build-selected-audio.py --install-game` 也会保留这些已采用动作。

验证：6 项相关单元测试；Chrome 实际解码 19 个游戏音源、原四类射击/换弹同步/敌人音量，以及八种食物的音源、食用时长、播放取消和数量保留；TypeScript 检查。按本轮影响范围选择检查，未执行全量游戏回归。
