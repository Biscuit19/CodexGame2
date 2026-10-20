# 本地音效

12个OGG均为授权清楚的CC0素材剪辑或混音。完整来源、选型表、备选和运行规则见[音效设计文档](../../../docs/AUDIO_DESIGN.md)；逐层文件、固定版本、原始SHA-256及成品SHA-256见[sources.json](sources.json)，作者声明与授权原文见[licenses](licenses)。

来源：Caine、MaxCarnage／Team Forbidden LLC的Warfork CC0音效包；Kenney Vleugels的RPG Audio和Impact Sounds；Ben Burnes／Abstraction的Organic Wooshes。这里不使用Warfork的专有官方声音，亦未使用CC BY-SA目录。衍生剪辑、混音继续按CC0发布。

复现：`python scripts/assets/build-game-audio.py`，需要ffmpeg。网络下载固定原素材到临时目录，生成成品到本目录；游戏客户端只读取本地打包音效。
