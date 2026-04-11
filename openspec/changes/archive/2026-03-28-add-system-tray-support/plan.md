# 计划：添加系统托盘支持

## 技术设计

### 概述
为 Electron 应用程序添加系统托盘功能，允许用户将应用最小化到托盘而非关闭，使后台任务能够继续运行。

### 技术栈
- Electron（内置 Tray API）
- 无需额外依赖

### 实现细节

#### 1. 托盘图标设置（electron/main.ts）
- 从 'electron' 导入 `Tray` 和 `Menu`
- 使用 `getIconPath()` 获取的现有应用图标作为托盘图标
- 在窗口创建后创建 `Tray` 实例
- 保存托盘引用以防止垃圾回收

#### 2. 窗口关闭行为
- 监听主窗口的 `close` 事件
- 使用 `event.preventDefault()` 阻止实际关闭
- 调用 `mainWindow.hide()` 改为最小化到托盘
- 这样可以通过 `mainWindow.show()` 再次显示窗口

#### 3. 托盘右键菜单
- 创建包含"显示窗口"和"退出"选项的右键菜单
- "显示窗口"调用 `mainWindow.show()` 和 `mainWindow.focus()`
- "退出"调用 `app.quit()` 完全退出

#### 4. 服务器进程持续运行
- 服务器进程（`serverProcess`）在 `app.whenReady()` 中启动
- 窗口隐藏不影响服务器进程
- 服务器进程仅在 `app.on('before-quit')` 或用户明确退出时终止

#### 5. macOS 特定
- 在 macOS 上，最小化到托盘时使用 `app.dock.hide()` 隐藏 Dock 图标
- 用户恢复窗口时再次显示 Dock 图标

### 修改的文件
1. `electron/main.ts` - 添加托盘功能
2. `electron/preload.ts` - 可选：添加托盘 IPC API（如需要）

### 边缘情况处理
- 处理托盘图标加载失败的情况（回退到窗口关闭）
- 处理窗口已经隐藏的情况
- 确保应用退出时移除托盘图标