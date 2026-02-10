# 实现计划：添加 Electron 桌面应用支持

**分支**：`feature/electron-desktop-support` | **日期**：2026-02-10 | **规范**：`proposal.md`
**输入**：来自 `proposal.md` 的功能需求

## 概要

为投资助手应用添加 Electron 桌面应用支持，允许用户在 Windows、macOS 和 Linux 平台上以原生桌面应用的方式使用投资分析工具。主要技术挑战包括：

1. 将 Next.js 应用集成到 Electron 中
2. 解决 Electron 打包后原生模块（better-sqlite3）的兼容性问题
3. 管理开发和生产环境下的数据库路径
4. 实现独立的服务器进程管理和健康检查

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, React 19, Electron 40, LibSQL, Drizzle ORM
**存储**：LibSQL (通过 @libsql/client)，支持开发和生产环境
**测试**：Vitest
**目标平台**：Windows, macOS, Linux (桌面) + Web
**项目类型**：Next.js App Router + Electron
**性能目标**：桌面应用启动 < 3s，API 响应 < 1s
**约束条件**：必须支持打包后的数据库访问，保持与 Web 应用的功能一致性

## 规范检查

- 检查是否符合 [项目规范](file://openspec/agent/memory/constitution.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-electron-desktop-support/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── database/            # 影响的 capability
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
electron/
├── main.ts                  # Electron 主进程入口
├── preload.ts               # 预加载脚本（安全桥接）
└── tsconfig.json            # Electron TypeScript 配置

build/
├── icon.png                 # 应用图标（PNG）
├── icon.ico                 # 应用图标（Windows）
├── icon.icns                # 应用图标（macOS）
└── entitlements.mac.plist   # macOS 权限配置

scripts/
├── build-electron.mjs       # Electron 构建脚本
└── after-pack.js            # 打包后处理

src/
├── server/
│   └── lib/
│       ├── db.ts            # UPDATE: 使用 DatabaseManager
│       └── DatabaseManager.ts # NEW: 数据库管理器
├── app/
│   └── api/
│       └── health/
│           └── route.ts     # NEW: 健康检查端点

electron-builder.yml         # Electron Builder 配置
pnpm-workspace.yaml          # UPDATE: 忽略构建依赖
next.config.ts               # UPDATE: standalone 输出
package.json                 # UPDATE: 依赖和脚本
```

**结构决策**：
- `electron/` 目录：存放 Electron 特定代码，与 Next.js 代码隔离
- `DatabaseManager.ts`：统一管理数据库连接，处理 Web 和 Desktop 环境差异
- `scripts/`：存放构建脚本，处理打包后资源文件复制

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为桌面应用用户，我可以在 Windows/macOS/Linux 上安装并运行投资助手 | 在目标平台上成功安装并启动应用 |
| P1 | 作为用户，我的数据存储在本地，应用更新后不会丢失 | 更新应用后检查数据是否保留 |
| P1 | 作为用户，我可以离线访问之前缓存的数据 | 断开网络后查看本地数据 |
| P2 | 作为用户，应用启动速度快（< 3s） | 计时应用启动到首页加载完整的时间 |
| P2 | 作为开发者，我可以使用 `npm run electron:dev` 进行开发 | 开发模式下应用正常加载和热更新 |
| P3 | 作为用户，应用支持原生通知和系统集成 | 触发通知并验证系统集成行为 |

## 技术架构

### 数据流

```
[Electron 主进程] → [UtilityProcess] → [Next.js Server]
                          ↓                    ↓
                   [环境变量注入]         [DatabaseManager]
                          ↓                    ↓
                   [userDataPath]    → [LibSQL Client]
                                                ↓
                                        [Drizzle ORM]
```

### 状态管理
- **服务端**: Zustand stores 保持不变
- **客户端**: 使用现有的 Zustand stores
- **缓存策略**: 保持现有的缓存策略，数据库路径根据环境动态确定

### 数据库架构

```typescript
DatabaseManager (单例模式)
├── getInstance()           // 获取单例实例
├── initDatabase()          // 初始化数据库连接
├── getDb()                 // 获取 Drizzle 实例
├── migrate()               // 执行数据库迁移
└── close()                 // 关闭连接

路径策略:
├── 开发环境: 项目根目录/sqlite.db
└── 生产环境: app.getPath('userData')/sqlite.db
```

### Electron 架构

```
main.ts (主进程)
├── loadUserShellEnv()      // 加载用户环境变量（API keys, PATH）
├── checkNativeModuleABI()  // 验证原生模块 ABI 兼容性
├── getPort()               // 获取可用端口
├── startServer()           // 启动 Next.js 服务器
├── waitForServer()         // 等待服务器就绪
└── createWindow()          // 创建窗口
```

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 使用 LibSQL 替代 better-sqlite3 | better-sqlite3 在 Electron 打包后存在 ABI 不兼容问题 | 直接修复 ABI 需要手动重建原生模块，容易出错；LibSQL 提供更好的跨平台支持 |
| 自定义 DatabaseManager 类 | 需要处理 Web 和 Desktop 环境的数据库路径差异 | 环境变量方式不够灵活，无法自动处理迁移文件路径 |
| UtilityProcess 启动服务器 | 避免在 macOS 上产生额外的 Dock 图标 | 使用 childProcess.fork 会产生额外图标；UtilityProcess 更专业 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| better-sqlite3 ABI 不兼容 | 高 | 使用 LibSQL 替代，添加启动时的 ABI 检查 |
| 数据库迁移文件路径问题 | 高 | DatabaseManager 自动检测环境并使用正确的迁移路径 |
| 用户环境变量不完整 | 中 | 在启动时加载用户 shell 环境（~/.zshrc, ~/.bashrc） |
| 端口被占用 | 中 | 动态获取可用端口，而非固定端口 |
| 跨平台构建 | 中 | 使用 electron-builder 的标准配置，CI 自动化测试 |

## 性能考虑

- **应用启动时间**: 目标 < 3s（开发模式的连接延迟不计入）
- **数据库查询**: 使用现有索引，无性能退化
- **打包体积**: 通过 pnpm-workspace 忽略构建依赖控制体积

## 安全考虑

- **contextIsolation**: 启用以隔离渲染进程
- **nodeIntegration**: 禁用以防止直接访问 Node.js API
- **preload**: 提供安全的 API 桥接
- **Electron 签名**: macOS 使用 entitlements.mac.plist 配置权限

## 测试策略

- **单元测试**: 测试 DatabaseManager 的路径逻辑
- **集成测试**: 测试 Health API 端点
- **手动测试**: 在 Windows、macOS 上验证打包后的应用功能