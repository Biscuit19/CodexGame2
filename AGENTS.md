# 浏览器开发约定

- 界面修改必须使用真实 Google Chrome 验证，不能只以 Firefox 或 Chromium 测试通过作为兼容结论。CI 同时完整运行 Chromium 和 Google Chrome 的浏览器测试。
- 对话框优先复用直接挂在 body 下的原生 dialog，并用 showModal 进入浏览器顶层。背景由 dialog 本体绘制，内容直接放入其内部；不要嵌套 fixed 遮罩或 backdrop-filter 模糊背景。这类组合曾造成 Chrome 中菜单与图鉴详情有状态却不可见。
- 除 DOM 与点击断言外，关键弹窗、提示和 HUD 还要截屏检查实际可见性、文字与图片布局。测试应覆盖 Esc、关闭按钮以及弹窗位于高层画布上方的情况。
- 标题页的临时测试入口不占用存档。temporary 状态不得写入 localStorage、IndexedDB、正式存档槽缓存或当前槽记录；退出本局、结算、设置变更、刷新与退出页面也要遵守。
- 使用现有检出开发，不另建 worktree。保留用户已有修改，完成适当测试后按用户授权推送、部署并验证公开站点。
