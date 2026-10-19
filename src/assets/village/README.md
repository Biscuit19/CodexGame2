# 猫尾乡野模型

## 主要模型：Tiny Treats

[Tiny Treats Homely House 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0)，固定提交 `75ad29a12b4e26dd1c7abda1e1486d6d731d8e16`，CC0，原授权见 [LICENSE-TinyTreats.txt](LICENSE-TinyTreats.txt)。允许修改和随游戏发布。

主要建筑基于 `house.gltf`，保留原有橙色屋顶、灰蓝墙面、蓝色单扇门、窗框、烟囱、平滑法线和UV渐变贴图；仅做可玩内部空间、开门、屋顶拆分以及少量医疗/猫爪标记。取消上一版改色和双门拆分。主体墙面沿原模型5×3比例缩小，中央门厅仍保留。原门绕真实左侧铰链外开109度，模型门洞与物理门洞相同。

源模型在Blender坐标中地板z=0.4、主墙x=±2.5/y=±1.5，门厅前缘y=-2.5。先在源单位挖空，再明确烘焙对象变换并按比例缩小、将地板对齐世界0；不得重复应用门和烟囱的原位移，也不得将门位置误写成偏向右侧。运行时主体与屋顶均保留10%不透明度。

新增同系列 [Tiny Treats Pretty Park 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Pretty-Park-1.0)，作者Isa Lousberg，固定提交 `050e7ba991da7d4338d5539d35acd97134709386`。CC0，原授权见 [LICENSE-TinyTreats-PrettyPark.txt](LICENSE-TinyTreats-PrettyPark.txt)。采用 `grass_A`、`flower_A`、`flower_B` 和 `bush`，保留原材质与轮廓。

桥梁和带绑带、草卷端面细节的草垛为本项目制作的圆润模型。桥面顶面为0；整体不能再次按外包围盒归一化，否则会导致角色陷入桥面。

复现：使用Blender 4.3及上述固定版本素材：

```sh
blender --background --threads 4 --python scripts/assets/build-rounded-village.py -- /path/to/Tiny-Treats-Homely-House-1.0 /path/to/Tiny-Treats-Pretty-Park-1.0
```

## 保留的小型道具：KayKit

[KayKit Medieval Hexagon Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)，作者Kay Lousberg，固定提交 `84fa4e91af6a88989be7c99e0891cede11f2ca38`，CC0，原授权见 [LICENSE-KayKit.txt](LICENSE-KayKit.txt)。当前仅保留石头、木材、箱桶、风车和手推车；主要建筑、树、桥和木栏已替换。

旧版导出脚本 `scripts/assets/build-village.py` 保留用于追溯KayKit道具来源。它会同时导出旧版建筑；如需重建全部素材，应先运行旧脚本，再运行上述Tiny Treats脚本覆盖已替换模型并导出新增花草。

运行时保留贴图与法线，按材质和屋顶/主体/地板可见性合并批次。模型及其纹理随GLB打包，不依赖远程素材服务。
