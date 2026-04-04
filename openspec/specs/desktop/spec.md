# desktop Specification

## Purpose
TBD - created by archiving change add-system-tray-support. Update Purpose after archive.
## Requirements
### Requirement: System Tray Minimization
应用程序 SHALL 在用户点击关闭按钮时最小化到系统托盘而不是退出，从而允许后台任务继续运行。

#### Scenario: Close button minimizes to tray
- **GIVEN** 应用正在运行且窗口可见
- **WHEN** 用户点击窗口关闭按钮（X）
- **THEN** 窗口应被隐藏（最小化到托盘）
- **AND** 应用应在后台保持运行
- **AND** 内部服务器进程应继续执行

#### Scenario: Tray icon appears on minimize
- **GIVEN** 应用已最小化到托盘
- **WHEN** 窗口被隐藏
- **THEN** 托盘图标应出现在系统托盘区域
- **AND** 托盘图标应可见且可点击

#### Scenario: Tray context menu shows options
- **GIVEN** 应用正在系统托盘中运行
- **WHEN** 用户右键点击托盘图标
- **THEN** 应出现上下文菜单，至少包含"显示"和"退出"选项

#### Scenario: Show restores window
- **GIVEN** 应用正在系统托盘中运行
- **WHEN** 用户点击托盘上下文菜单中的"显示"或双击托盘图标
- **THEN** 主窗口应变为可见
- **AND** 窗口应被置前

#### Scenario: Quit fully exits application
- **GIVEN** 应用正在系统托盘中运行
- **WHEN** 用户点击托盘上下文菜单中的"退出"
- **THEN** 应用应完全退出
- **AND** 内部服务器进程应被终止

#### Scenario: Background tasks continue when minimized
- **GIVEN** 应用有正在运行的定时任务或活动的 AI 代理操作
- **WHEN** 用户将应用最小化到托盘
- **THEN** 所有后台任务应继续执行
- **AND** 服务器进程应保持运行

### Requirement: macOS Dock Icon Behavior
On macOS, the application SHALL handle dock icon visibility appropriately when minimized to tray.

#### Scenario: Dock icon hidden on macOS when minimized
- **GIVEN** 应用运行在 macOS 上
- **WHEN** 用户最小化到托盘
- **THEN** Dock 图标应被隐藏（可选，根据用户偏好）
- **AND** 托盘图标应在菜单栏可见

