# 猫尾乡野模型

来源：[KayKit Medieval Hexagon Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)，作者 Kay Lousberg，固定来源提交 `84fa4e91af6a88989be7c99e0891cede11f2ca38`。

授权：CC0，原始授权全文见 [LICENSE-KayKit.txt](LICENSE-KayKit.txt)，允许使用、修改及随游戏分发。感谢作者公开这些资源。

采用该包的木屋、集市、风车、桥梁、围栏、树石及工具等模型。未采用城堡和兵营。建筑不是在运行时用方块替代，而是导入完整模型，在 Blender 中修改比例、配色，开出实际门洞和内部空间，并拆分屋顶。诊所医疗标记、谷仓与农庄猫爪标记为本项目增加。

模型统一烘焙为顶点色，GLB不请求远程贴图；运行时合并屋顶/主体材质批次，保留可独立淡化的屋顶。场景只放置少量模型，不复制素材包的六边形地面，也不使用参考图片作为地面。

复现：检出上述固定来源提交，用 Blender 4.3 执行：

```sh
blender --background --python scripts/assets/build-village.py -- /path/to/KayKit-Medieval-Hexagon-Pack-1.0
```

筛选比较：也检查了同作者 City Builder Bits 1.0（CC0，来源提交 `63976910ca04d16f0fc531b9c614244be8128713`）；其城市建筑较现代，本地图未采用其模型。Kenney、Quaternius 的官网在当前环境中无法访问，没有把未取得或未核验的素材加入仓库。
