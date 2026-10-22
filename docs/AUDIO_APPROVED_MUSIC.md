# 最新采用：步枪、四级发现与音乐（2026-10-22）

覆盖此前相同条目，用户明确选择如下。

| 用途 | 选择 | 作者 | 原页 | 许可 |
| --- | --- | --- | --- | --- |
| shot-rifle | SM1 ·  | Michael Klier | [原发行页](https://opengameart.org/content/futuristic-smg) | CC-BY-SA-3.0 |
| discover-4 | D3-4 ·  | Bart Kelsey（Will Corwin 委托） | [原发行页](https://opengameart.org/content/level-up-sound-effects) | CC-BY-3.0 |
| BG3 | BG3 · 静静的小镇 · Calm BGM | syncopika | [原发行页](https://opengameart.org/content/calm-bgm) | CC-BY-3.0 |
| BG5 | BG5 · 蓝莓 · Blueberries | Viktor Kraus | [原发行页](https://opengameart.org/content/blueberries) | CC-BY-3.0 |
| BG6 | BG6 · 安静角落 · Peaceful Place | Alexandr Zhelanov | [原发行页](https://opengameart.org/content/peaceful-place) | CC-BY-3.0 |
| BG10 | BG10 · 祥和村庄 · Peaceful Village | Stefan_Composer | [原发行页](https://opengameart.org/content/peaceful-village) | CC-BY-3.0 |

SM1虽然在试听页的冲锋枪分类中，用户明确将它用于**步枪**，不得误改冲锋枪。四级发现明确采用跨组D3-4，不按编号重新解释物品等级。两者只固定匹配音量，仍保留原音色；其他枪声、换弹、猫叫和动作文件保持原样。

四首音乐为完整原文件，字节哈希与试听原件相同，不转码、不截取、不变速。按曲固定播放增益匹配响度。设置提供四首曲目和“单曲循环／四首随机播放”，默认BG5蓝莓单曲循环；随机接续避免连续重复同一首。切曲只保留一个音乐播放器，关闭音乐暂停播放；后台页面暂停、回到前台继续。设置进入正常存档；旧存档缺少新字段时回退BG5循环，临时测试不写任何存档。

整体主输出增益×1.3，用户原滑块比例不改，避免每次读取存档重复放大。枪声再单独×0.7：与其他声音相比降低30%，包含敌人枪声；敌人/玩家枪声比仍50%。因此同一原枪声相较改动前绝对增益为0.91，而普通音效为1.3。发现声此前1.2的额外反馈比例保留，换弹不随枪声降低。游戏原合成配乐由这四首完整音乐替换。

安装：`python scripts/assets/install-approved-music.py`。此前安装链最后会重新应用本轮选择，防止恢复旧步枪或D4-1。逐文件来源与处理见`src/assets/audio/approved-music.json`；运行时音乐清单见`src/music.ts`。

验证：相关9项单元测试、Chrome音乐设置/实际音频文件测试，真实四类射击增益/换弹取消专项检查，以及新试听页两项桌面/手机测试；构建检查和发布后轻量资源核验。未重复地图全量回归。新20候选仅供试听，不接入游戏。
