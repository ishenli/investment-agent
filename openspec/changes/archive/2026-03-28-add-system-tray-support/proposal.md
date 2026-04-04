# Change Proposal: add-system-tray-support

## Metadata

- **Change ID**: add-system-tray-support
- **Title**: 添加系统托盘支持
- **Status**: proposed
- **Created**: 2026-03-18
- **Author**: AI Assistant

## Why

当前投资助手作为 Electron 桌面应用运行。当用户点击关闭按钮时，应用会完全退出，终止内部服务器进程和所有后台任务（定时任务、AI 代理操作等）。用户需要能够将应用最小化到系统托盘并保持在后台运行，使定时任务和其他后台操作能够继续执行。

## What Changes

- **ADD** 系统托盘图标功能 SHALL 被添加到 Electron 主进程
- **ADD** 托盘右键菜单 SHALL 包含"显示窗口"和"退出应用"选项
- **MODIFY** 窗口关闭行为，改为隐藏窗口而非退出应用
- **ADD** IPC 通信用于托盘相关操作

## Non-Goals

- **NOT** 添加托盘气泡通知功能
- **NOT** 修改现有的定时任务逻辑

## Impact

### Affected Specs
- `specs/desktop/spec.md` - NEW: 添加桌面系统托盘功能规范

### Affected Code
- `electron/main.ts` - UPDATE: 添加托盘功能和修改窗口关闭行为
- `electron/preload.ts` - UPDATE: 可选添加托盘 IPC API

### Success Criteria

1. **托盘图标显示**：应用最小化时托盘图标正确显示
2. **关闭按钮行为**：点击关闭按钮时窗口隐藏而非退出
3. **托盘菜单**：右键点击托盘显示"显示"和"退出"菜单
4. **恢复窗口**：点击"显示"或双击托盘图标恢复窗口
5. **完全退出**：点击"退出"时应用完全退出
6. **后台任务**：窗口隐藏时服务器进程和后台任务继续运行
7. **macOS 支持**：macOS 上 Dock 图标正确处理