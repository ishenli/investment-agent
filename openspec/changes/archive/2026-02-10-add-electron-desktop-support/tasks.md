# 任务：添加 Electron 桌面应用支持

**输入**：来自 `proposal.md` 和 `plan.md` 的设计文档
**前置条件**：plan.md（已创建）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 代码检查：`pnpm run lint`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| Electron 主进程 | `electron/main.ts` |
| 预加载脚本 | `electron/preload.ts` |
| 数据库管理器 | `src/server/lib/DatabaseManager.ts` |
| API Routes | `src/app/api/[capability]/route.ts` |
| 构建脚本 | `scripts/` |
| 配置文件 | 项目根目录 |

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-electron-desktop-support/` <!-- id: 0 -->
- [x] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [x] T02 编写 plan.md 技术设计文档 <!-- id: 2 -->
- [x] T03 编写 spec delta 规范变更 <!-- id: 3 -->

---

## 第1阶段：基础依赖和配置

**目的**：安装 Electron 相关依赖，配置项目构建环境

- [ ] T004 [P] 在 `package.json` 中添加 Electron 相关依赖
  - electron ^40.2.1
  - electron-builder ^26.7.0
  - electron-rebuild ^3.2.9
  - @libsql/client ^0.17.0
  - @libsql/darwin-arm64 ^0.5.22
  - concurrently ^9.2.1
  - esbuild ^0.27.3
  - wait-on ^9.0.3
  <!-- id: 4 -->
- [ ] T005 [P] 添加 npm scripts 到 `package.json`
  - electron:dev
  - electron:build
  - electron:pack
  - electron:pack:mac
  <!-- id: 5 -->
- [ ] T006 [P] 更新 `pnpm-workspace.yaml` 忽略构建依赖
  <!-- id: 6 -->
- [ ] T007 [P] 更新 `next.config.ts` 添加 standalone 输出配置
  <!-- id: 7 -->
- [ ] T008 [P] 更新 `.gitignore` 添加 Electron 构建产物
  <!-- id: 8 -->

**检查点**：依赖安装完成，配置文件更新

---

## 第2阶段：数据库基础设施

**目的**：创建 DatabaseManager 以支持开发和生产环境

**⚠️ 关键**：此阶段完成前不应开始 Electron 主进程工作

- [ ] T009 [P] 创建 `src/server/lib/DatabaseManager.ts`
  - 单例模式实现
  - 开发/生产环境路径检测
  - LibSQL 客户端初始化
  - 数据库迁移处理
  <!-- id: 9 -->
- [ ] T010 更新 `src/server/lib/db.ts` 使用 DatabaseManager
  <!-- id: 10 -->
- [ ] T011 [P] 在 `src/server/base/env.ts` 添加环境检测辅助函数
  - isDevelopment()
  - isElectron()
  <!-- id: 11 -->
- [ ] T012 编写 DatabaseManager 单元测试
  <!-- id: 12 -->
- [ ] T013 验证数据库在两种环境下都能正常工作
  <!-- id: 13 -->

**检查点**：数据库管理器就绪，可以开始其他工作

---

## 第3阶段：Electron 主进程

- [ ] T014 [P] 创建 `electron/main.ts`
  - 应用启动逻辑
  - 用户环境变量加载 (loadUserShellEnv)
  - 原生模块 ABI 检查 (checkNativeModuleABI)
  - 端口获取工具 (getPort)
  - UTILITY 服务器启动 (startServer)
  - 服务器等待逻辑 (waitForServer)
  - 窗口创建 (createWindow)
  <!-- id: 14 -->
- [ ] T015 [P] 创建 `electron/preload.ts`
  - 安全 IPC 桥接
  <!-- id: 15 -->
- [ ] T016 [P] 创建 `electron/tsconfig.json`
  <!-- id: 16 -->
- [ ] T017 添加健康检查 API `src/app/api/health/route.ts`
  <!-- id: 17 -->

---

## 第4阶段：User Story 1 - 桌面应用基础功能 (优先级：P1) 🎯 MVP

**目标**：用户可以在 Windows/macOS/Linux 上安装并运行投资助手桌面应用
**独立测试**：在目标平台上成功安装并启动应用

### 构建

- [ ] T018 [P] [US1] 创建 `electron-builder.yml` 配置文件
  <!-- id: 18 -->
- [ ] T019 [P] [US1] 创建 `scripts/build-electron.mjs` 构建脚本
  - esbuild 编译主进程
  - 编译预加载脚本
  <!-- id: 19 -->
- [ ] T020 [P] [US1] 创建 `scripts/after-pack.js` 打包后处理脚本
  <!-- id: 20 -->

### 资源

- [ ] T021 [P] [US1] 准备应用图标
  - build/icon.png (Linux)
  - build/icon.ico (Windows)
  - build/icon.icns (macOS)
  <!-- id: 21 -->
- [ ] T022 [US1] 创建 macOS 权限配置 `build/entitlements.mac.plist`
  <!-- id: 22 -->
- [ ] T023 [P] [US1] 在 `package.json` 添加入口点配置
  - main: dist-electron/main.js
  <!-- id: 23 -->

### 验证

- [ ] T024 [US1] 验证 `npm run electron:dev` 在开发模式下正常工作
  <!-- id: 24 -->
- [ ] T025 [US1] 验证 `npm run electron:pack` 能够成功打包
  <!-- id: 25 -->
- [ ] T026 [US1] 验证打包后的应用能够启动并访问数据库
  <!-- id: 26 -->

**检查点**：US1 功能完整，桌面应用可运行

---

## 第5阶段：User Story 2 - 数据持久化 (优先级：P1)

**目标**：用户数据存储在本地，应用更新后不会丢失
**独立测试**：更新应用后检查数据是否保留

- [ ] T027 [US2] 验证生产环境下数据库路径正确（app.getPath('userData')）
  <!-- id: 27 -->
- [ ] T028 [US2] 验证数据库迁移在生产环境下正常执行
  <!-- id: 28 -->
- [ ] T029 [US2] 测试应用更新后数据保留
  <!-- id: 29 -->

---

## 第6阶段：User Story 3 - 性能检查 (优先级：P2)

**目标**：应用启动速度快
**独立测试**：计时从应用启动到首页加载完整的时间

- [ ] T030 [US3] 测量和优化应用启动时间
  <!-- id: 30 -->
- [ ] T031 [US3] 验证数据库查询性能无退化
  <!-- id: 31 -->
- [ ] T032 [US3] 添加版本更新时缓存清理逻辑
  <!-- id: 32 -->

---

## 第7阶段：文档更新

- [ ] T033 [P] 更新 `README.md` 添加 Electron 支持说明
  <!-- id: 33 -->
- [ ] T034 [P] 添加构建和部署文档（如需要）
  <!-- id: 34 -->

---

## 第8阶段：完善与质量保证

- [ ] T035 运行 `pnpm run lint:fix` 并修复问题
  <!-- id: 35 -->
- [ ] T036 运行 `pnpm run types:check` 确保类型正确
  <!-- id: 36 -->
- [ ] T037 运行 `pnpm test` 确保测试通过
  <!-- id: 37 -->
- [ ] T038 在目标平台进行最终验证
  <!-- id: 38 -->

---

## 第9阶段：归档准备

- [ ] T039 更新所有 TODO 状态为完成
  <!-- id: 39 -->
- [ ] T040 运行 `openspec validate add-electron-desktop-support --strict` 验证
  <!-- id: 40 -->

---

## 依赖关系

### 阶段依赖

- **第0阶段**：立即进行
- **第1阶段**：依赖第0阶段
- **第2阶段**：依赖第1阶段 - 阻塞 Electron UI
- **第3阶段**：依赖第1、2阶段
- **User Stories**：依赖第2、3阶段完成
- **质量保证**：依赖期望的 US 完成

### 并行机会

- T004-T008（配置文件）可以并行
- T010-T012（测试）可以与其他工作并行
- T018-T023（构建资源）可以并行