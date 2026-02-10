# Change Proposal: add-electron-desktop-support

## Metadata

- **Change ID**: add-electron-desktop-support
- **Title**: 添加 Electron 桌面应用支持
- **Status**: implemented
- **Created**: 2026-02-10
- **Author**: AI Assistant

## Why

当前投资助手仅作为 Web 应用运行。添加 Electron 桌面应用支持将提供以下好处：

1. **桌面应用体验**：用户可以在不打开浏览器的情况下使用应用
2. **本地化数据存储**：数据存储在用户本地，不依赖云端
3. **更好的性能**：通过独立的进程管理和本地缓存提供更好的性能
4. **离线能力**：可以在无网络连接时访问本地存储的数据
5. **统一的用户体验**：Windows、macOS 和 Linux 平台保持一致的用户体验
6. **原生特性**：支持原生通知、系统集成等特性

## What Changes

- **ADD** Electron 主进程 (`electron/main.ts`)
- **ADD** Electron 预加载脚本 (`electron/preload.ts`)
- **ADD** Electron 构建配置 (`electron-builder.yml`)
- **ADD** 应用图标资源 (`build/icon.png`, `build/icon.ico`, `build/icon.icns`)
- **ADD** macOS 权限配置 (`build/entitlements.mac.plist`)
- **ADD** Electron 构建脚本 (`scripts/build-electron.mjs`, `scripts/after-pack.js`)
- **ADD** 数据库管理器类 (`src/server/lib/DatabaseManager.ts`)
- **ADD** 健康检查 API (`src/app/api/health/route.ts`)
- **MODIFY** `src/server/lib/db.ts` - 使用 DatabaseManager 替代直接数据库连接
- **MODIFY** `package.json` - 添加 Electron 相关依赖和脚本
- **MODIFY** `next.config.ts` - 配置 standalone 输出和外部包
- **MODIFY** `pnpm-workspace.yaml` - 忽略 Electron 相关的构建依赖
- **MODIFY** `.gitignore` - 添加 Electron 构建产物忽略规则
- **MODIFY** `README.md` - 更新文档说明 Electron 支持

## Non-Goals

- **NOT** 替换现有的 Web 应用
- **NOT** 修改业务逻辑或数据库 schema
- **NOT** 添加新的业务功能
- **NOT** 改变现有的 API 接口

## Impact

### Affected Specs
- `specs/database/spec.md` - MODIFIED: 添加 Desktop 环境的数据库路径管理要求

### Affected Code
- `electron/main.ts` - NEW: Electron 主进程入口
- `electron/preload.ts` - NEW: 预加载脚本，安全桥接主进程和渲染进程
- `electron-builder.yml` - NEW: Electron Builder 构建配置
- `src/server/lib/DatabaseManager.ts` - NEW: 数据库管理器，处理开发和生产环境
- `src/server/lib/db.ts` - UPDATE: 使用 DatabaseManager
- `src/app/api/health/route.ts` - NEW: 健康检查端点
- `package.json` - UPDATE: 添加 Electron 相关依赖和脚本
- `next.config.ts` - UPDATE: standalone 输出配置
- `script/build-electron.mjs` - NEW: Electron 构建脚本
- `script/after-pack.js` - NEW: 打包后处理脚本

### Success Criteria

1. **桌面应用启动**：Electron 应用能够成功启动并加载 Next.js 服务
2. **数据库访问**：在打包后的应用中，数据库能够正常访问和操作
3. **开发模式支持**：`npm run electron:dev` 能够正常运行
4. **构建成功**：`npm run electron:pack` 能够成功构建桌面应用
5. **跨平台**：在 Windows、macOS 和 Linux 上都能正常打包和运行
6. **数据持久化**：用户数据在应用更新后仍然保留

## Background

### 技术方案

使用 Electron 框架将现有的 Next.js Web 应用打包为桌面应用：

**开发模式**：
- Next.js 开发服务器运行在 8888 端口
- Electron 加载 http://127.0.0.1:8888

**生产模式**：
- Next.js 构建为 standalone 输出
- Electron utilityProcess 启动 Node.js 服务器
- 动态分配可用端口
- Electron 加载服务器地址

### 数据库解决方案

**问题**：当 Electron 应用打包后，`better-sqlite3` 原生模块和数据库文件路径出现问题

**解决**：
1. 使用 `@libsql/client` 替代 `better-sqlite3`，因为 libsql 对 Electron 有更好的支持
2. 创建 `DatabaseManager` 类来管理数据库连接
3. 在开发环境中，数据库存储在项目目录
4. 在生产环境中，数据库存储在用户数据目录（`app.getPath('userData')`）
5. 自动处理数据库迁移文件的路径问题

### 构建流程

1. 运行 `next build` 生成 Next.js 生产构建
2. 使用 esbuild 编译 Electron 主进程和预加载脚本
3. 使用 electron-builder 打包桌面应用
4. after-pack 脚本确保资源文件（如迁移文件）正确复制

## Related References

- Electron 文档: https://www.electronjs.org/docs
- LibSQL 文档: https://docs.turso.tech/sdk/ts/quickstart
- Electron Builder 文档: https://www.electron.build/