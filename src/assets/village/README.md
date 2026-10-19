# 猫尾乡野模型

## 主要模型：Tiny Treats

[Tiny Treats Homely House 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0)，固定提交 `75ad29a12b4e26dd1c7abda1e1486d6d731d8e16`，CC0，原授权见 [LICENSE-TinyTreats.txt](LICENSE-TinyTreats.txt)。允许修改和随游戏发布。

主要建筑基于其 `house.gltf` 完整模型改造，不用方块取代原建筑。保留原屋顶、檐口、圆润窗框、门板结构、平滑法线与UV渐变贴图，降低色彩饱和度，去掉爱心，分成猎人、诊所、商店、民居、谷仓和农庄六种外观。用Blender开出内部空间与门洞、拆分屋顶、改成双开门，加入齐平地板、诊所医疗标记、商店遮雨棚和谷仓猫爪。树和低木栏使用同包 `tree_large` 和 `fence_rails_long`。

桥梁为本项目制作的圆角木板、纵梁与桥栏模型。桥面顶面为0；整体不能再次按外包围盒归一化，否则会导致角色陷入桥面。

复现：使用Blender 4.3及上述固定版本素材：

```sh
blender --background --threads 4 --python scripts/assets/build-rounded-village.py -- /path/to/Tiny-Treats-Homely-House-1.0
```

## 保留的小型道具：KayKit

[KayKit Medieval Hexagon Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)，作者Kay Lousberg，固定提交 `84fa4e91af6a88989be7c99e0891cede11f2ca38`，CC0，原授权见 [LICENSE-KayKit.txt](LICENSE-KayKit.txt)。当前仅保留石头、木材、箱桶、风车和手推车；主要建筑、树、桥和木栏已替换。

旧版导出脚本 `scripts/assets/build-village.py` 保留用于追溯KayKit道具来源。它会同时导出旧版建筑；如需重建全部素材，应先运行旧脚本，再运行上述Tiny Treats脚本覆盖九个已替换模型。

运行时保留贴图与法线，按材质和屋顶/主体/地板可见性合并批次。模型及其纹理随GLB打包，不依赖远程素材服务。
