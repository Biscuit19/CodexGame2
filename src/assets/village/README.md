# 猫尾乡野模型

## 主要模型：Tiny Treats

[Tiny Treats Homely House 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Homely-House-1.0)，固定提交 `75ad29a12b4e26dd1c7abda1e1486d6d731d8e16`，CC0，原授权见 [LICENSE-TinyTreats.txt](LICENSE-TinyTreats.txt)。允许修改和随游戏发布。

主要建筑基于 `house.gltf`，保留原有橙色屋顶、灰蓝墙面、蓝色单扇门、窗框、烟囱、平滑法线和UV渐变贴图；仅做可玩内部空间、开门、屋顶拆分以及少量医疗/猫爪标记。取消上一版改色和双门拆分。主体墙面沿原模型5×3比例缩小，中央门厅仍保留。原门绕真实左侧铰链外开109度，模型门洞与物理门洞相同。

源模型在Blender坐标中地板z=0.4、主墙x=±2.5/y=±1.5，门厅前缘y=-2.5。先在源单位挖空，再明确烘焙对象变换并按比例缩小、将地板对齐世界0；不得重复应用门和烟囱的原位移，也不得将门位置误写成偏向右侧。运行时主体与屋顶均保留10%不透明度。

新增同系列 [Tiny Treats Pretty Park 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Pretty-Park-1.0)，作者Isa Lousberg，固定提交 `050e7ba991da7d4338d5539d35acd97134709386`。CC0，原授权见 [LICENSE-TinyTreats-PrettyPark.txt](LICENSE-TinyTreats-PrettyPark.txt)。采用 `grass_A`、`flower_A`、`flower_B` 和 `bush`，保留原材质与轮廓。

## 本轮新增摆件与家具

| 来源（均为CC0） | 固定提交 | 本项目采用 |
|---|---|---|
| [Tiny Treats Pleasant Picnic 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Pleasant-Picnic-1.0) | `da50c97a056fe1513413343787f2526ea7f25174` | 野餐毯、篮子 |
| [Tiny Treats Charming Kitchen 1.0](https://github.com/TinyTreats-Game-Assets/Tiny-Treats-Charming-Kitchen-1.0) | `094b2e12d57e2ae847a749d40f5fcd14d1eef83b` | 杂货铺冰箱 |
| [KayKit Furniture Bits 1.0](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) | `96d5930a8dbdb363409bbc2d3341718b00e17c9c` | 单人床、书桌/木桌、木椅、带摆件杂物柜 |

Tiny Treats Homely House另采用原版长椅和信箱，Pretty Park增加原版路灯；KayKit Medieval Hexagon原系列补充红顶水井。保留各原模型材质、纹理和完整结构，统一尺寸、粗糙度及光照。授权全文随目录保存为对应LICENSE文件。

猎人主屋面积增加约50%，新增同系列副屋；诊所、商店、农庄适度增加平面空间，控制原屋顶高度；谷仓保留原墙体门窗并改为圆角低屋顶及檐边，避免巨大斜屋顶。小棚屋使用同一原模型缩小，清楚保留单扇外开门，仅一个箱子。新增屋内家具沿边摆放，不封住中间通道。

桥梁和带绑带、草卷端面细节的草垛为本项目制作的圆润模型。桥面顶面为0；整体不能再次按外包围盒归一化，否则会导致角色陷入桥面。

复现：使用Blender 4.3及上述固定版本素材：

```sh
blender --background --threads 4 --python scripts/assets/build-rounded-village.py -- /path/to/Tiny-Treats-Homely-House-1.0 /path/to/Tiny-Treats-Pretty-Park-1.0 /path/to/Tiny-Treats-Pleasant-Picnic-1.0 /path/to/Tiny-Treats-Charming-Kitchen-1.0 /path/to/KayKit-Furniture-Bits-1.0 /path/to/KayKit-Medieval-Hexagon-Pack-1.0
```

## 保留的小型道具：KayKit

[KayKit Medieval Hexagon Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)，作者Kay Lousberg，固定提交 `84fa4e91af6a88989be7c99e0891cede11f2ca38`，CC0，原授权见 [LICENSE-KayKit.txt](LICENSE-KayKit.txt)。当前保留石头、木材、箱桶、风车、手推车，并新增原版水井；主要建筑、树、桥和木栏已替换。

旧版导出脚本 `scripts/assets/build-village.py` 保留用于追溯KayKit道具来源。它会同时导出旧版建筑；如需重建全部素材，应先运行旧脚本，再运行上述Tiny Treats脚本覆盖已替换模型并导出新增花草。

运行时保留贴图与法线，按材质和屋顶/主体/地板可见性合并批次。模型及其纹理随GLB打包，不依赖远程素材服务。

## 开放式搜索点与补充装饰

沿用上表固定提交及CC0授权，新增Pretty Park的`fountain`、`trashcan`、`cobble_stones_large`、`bird`；Pleasant Picnic的`cooler`、`radio`；KayKit Hexagon的`sack`、`pallet`、`bucket_water`、`target`，保留原材质和完整细节。

`open-ruin.glb`从Homely House原始房屋拆去屋顶、门厅和部分损坏墙段，保留原窗框、墙面及饰条；复用已挖空的原房屋网格，再拆去独立屋顶与门廊，通过网格平面裁切限制外轮廓，避免在开放面上反复布尔裁切产生异常外伸面。`open-workshop.glb`来自KayKit Hexagon的`buildings/neutral/building_scaffolding.gltf`，保留完整露天木架结构，清出猫咪高度的中央过道。两者占地300×200，地板统一为0，不覆盖完整屋顶。运行时对应残墙或角柱碰撞；地图使用简略残墙/木架图符，不新增主要地名。用同一复现命令生成，无新增下载依赖。
