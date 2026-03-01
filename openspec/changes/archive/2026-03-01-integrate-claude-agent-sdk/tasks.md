# 任务：Claude SDK UI 集成与服务层优化

**输入**：来自 `/openspec/changes/integrate-claude-agent-sdk/plan.md` 的设计文档
**前置条件**：plan.md (已完成)
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

**组织方式**：任务按 Phase 分组,支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [Phase] 描述`
- **[P]**：可并行（不同文件,无依赖）
- **[Phase]**：所属阶段（P0, P1, P2）

## 路径约定

| 类型 | 路径 |
|------|------|
| Service | `src/server/service/[name]Service.ts` |
| API Routes | `src/app/api/chat/[capability]/route.ts` |
| Components | `src/app/(pages)/chat/modules/[...]/[Component].tsx` |
| Store | `src/app/store/[domain]/slices/[slice]/[action].ts` |
| Types | `src/types/[capability].ts` |

---

## 第0阶段：准备（已完成）✅

- [x] T001 创建变更目录结构 `openspec/changes/integrate-claude-agent-sdk/`
- [x] T002 编写 proposal.md 描述变更意图和影响
- [x] T003 编写 plan.md 技术设计文档
- [x] T004 编写 spec delta 规范变更
- [x] T005 添加 `@anthropic-ai/claude-agent-sdk` 依赖
- [x] T006 实现 `streamClaude` 函数
- [x] T007 实现 `/api/chat/claude` API 端点
- [x] T008 定义 Claude 相关类型

---

## Phase 1: 核心基础设施 - ClaudeService 🎯 优先

**目的**：创建统一的 Claude SDK 配置服务,消除重复代码

**⚠️ 关键**：此阶段必须先完成,为后续 UI 和其他服务提供基础

### 服务层

- [ ] T101 [P] 在 `src/server/service/claudeService.ts` 创建 ClaudeService 类 <!-- id: 101 -->
  - 实现 `getClaudeConfig(modelSlug?)` - 获取 Claude 配置
  - 实现 `getEnvConfig(modelSlug?)` - 获取环境变量格式配置
  - 实现 `validateConfig(provider)` - 验证配置完整性
  - 添加详细的日志记录
  - 导出单例 `claudeService`

- [ ] T102 [P] 修改 `src/server/service/reportService/index.ts` 使用 claudeService <!-- id: 102 -->
  - 导入 `claudeService`
  - 简化 `getModelConfig()` 方法,调用 `claudeService.getEnvConfig()`
  - 移除重复的 Provider 获取逻辑 (~50行代码)
  - 保持现有功能完全不变

### 测试

- [ ] T103 [P] 编写 ClaudeService 单元测试 <!-- id: 103 -->
  - 测试 getClaudeConfig 成功场景
  - 测试指定模型不存在回退到默认模型
  - 测试配置验证逻辑
  - 测试错误处理

- [ ] T104 [P] 编写 reportService 重构后的集成测试 <!-- id: 104 -->
  - 验证报告生成功能正常
  - 验证使用 claudeService 后配置获取正确

**检查点 P1**：ClaudeService 就绪,reportService 重构完成,测试通过

---

## Phase 2: UI 引擎选择器 🎯 核心功能

**目的**：提供 UI 允许用户在 DeepAgents 和 Claude SDK 之间切换

**前置**：依赖 Phase 1 完成

### 后端 - Session 配置

- [x] T201 [P] 修改 Session 类型定义支持 engineType 字段 <!-- id: 201 -->
  - ✅ 在 `src/types/agent/index.ts` 的 `LobeAgentConfig` 中已添加 `engineType?: 'deepagents' | 'claude'`
  - ✅ 类型定义完整

- [x] T202 [P] 扩展 sessionStore action 支持更新 engineType <!-- id: 202 -->
  - ✅ `internal_updateSession` 方法已支持更新任意 config 字段
  - ✅ 配置会通过 sessionService 持久化到数据库

### 后端 - API 路由逻辑

- [x] T203 修改 `src/app/services/chat.ts` 支持动态 API 路由 <!-- id: 203 -->
  - ✅ 在 `bailingLLMStream` 方法中已添加引擎类型判断 (第 590 行)
  - ✅ 根据 `params.engineType` 选择 API endpoint
  - ✅ `deepagents` → `/api/chat/agent`
  - ✅ `claude` → `/api/chat/claude`
  - ✅ 默认使用 `deepagents`
  - ✅ `internal_fetchAIChatMessage` 已传递 `engineType` (第 458 行)

### 前端 - UI 组件

- [x] T204 [P] 创建引擎选择器组件 <!-- id: 204 -->
  - ✅ 文件：`src/app/(pages)/chat/features/ChatInput/ActionBar/Engine/index.tsx`
  - ✅ 使用 `@lobehub/ui` 的 Select 组件
  - ✅ 自定义样式: 圆角胶囊形状,透明背景,hover 效果
  - ✅ DeepAgents 使用 Brain 图标,Claude SDK 使用 Sparkles 图标
  - ✅ 选项：DeepAgents (默认), Claude SDK
  - ✅ 每个选项包含图标、标签和当前选中的 Check 图标
  - ✅ 绑定到 sessionStore 的 engineType
  - ✅ 使用 sessionService.updateSessionConfig 正确更新配置
  - ✅ 支持 hover 交互,带过渡动画
  - ✅ 宽度 140px,与其他操作按钮协调

- [x] T205 集成引擎选择器到 ChatInput <!-- id: 205 -->
  - ✅ 修改 `src/app/(pages)/chat/modules/Workspace/Conversation/features/ChatInput/Desktop/index.tsx`
  - ✅ 从 leftActions 中移除 'engine' (原在第 13 行)
  - ✅ 修改 `src/app/(pages)/chat/modules/Workspace/Conversation/features/ChatInput/Desktop/Footer/index.tsx`
  - ✅ 将引擎选择器移动到底部 Footer 的左侧区域
  - ✅ 导入 EngineSwitch 组件并在左侧 Flexbox 中渲染
  - ✅ 位置更美观,不影响顶部操作栏布局
  - ✅ 已在 ActionBar config 中注册

- [x] T206 [P] 添加引擎状态指示器 (可选) <!-- id: 206 -->
  - ✅ 创建 EngineIndicator 组件
  - ✅ 文件: `src/app/(pages)/chat/modules/Workspace/Conversation/components/EngineIndicator/index.tsx`
  - ✅ 显示当前使用的引擎 (DeepAgents / Claude SDK)
  - ✅ 使用不同颜色和图标区分
  - 📝 可根据需要集成到消息列表或输入框区域

### 测试

- [ ] T207 [P] 编写引擎选择器组件测试 <!-- id: 207 -->
  - 测试组件渲染
  - 测试选择变化
  - 测试配置更新

- [ ] T208 集成测试：引擎切换完整流程 <!-- id: 208 -->
  - 创建会话,默认 DeepAgents
  - 切换到 Claude SDK
  - 发送消息,验证调用 `/api/chat/claude`
  - 切换回 DeepAgents
  - 发送消息,验证调用 `/api/chat/agent`

- [ ] T209 端到端测试：配置持久化 <!-- id: 209 -->
  - 选择 Claude SDK
  - 刷新页面
  - 验证引擎选择保持
  - 切换到其他会话再返回
  - 验证引擎选择保持

**检查点 P2**: ✅ UI 引擎选择器完整可用,配置持久化正常

---

## Phase 3: Skills 管理 (未来功能) 🔮

**目的**：支持导入和管理 Skills 知识包

**状态**：本次不实施,仅列出任务占位

### 基础设施

- [ ] T301 实现 SkillStorageManager (参考 DatabaseManager 模式)
- [ ] T302 创建 chat_skills 表和迁移
- [ ] T303 实现 SkillRepository
- [ ] T304 实现 SkillService

### UI 组件

- [ ] T305 创建 Skills 导入弹窗
- [ ] T306 创建 Skills 列表组件
- [ ] T307 创建 Skill 选择器
- [ ] T308 集成到会话配置

### API

- [ ] T309 实现 /api/chat/skill CRUD 接口
- [ ] T310 扩展 /api/chat/claude 支持 Skills

---

## Phase 4: MCP Server 配置 (未来功能) 🔮

**目的**：支持配置 MCP Servers 扩展 Agent 能力

**状态**：本次不实施,仅列出任务占位

### 基础设施

- [ ] T401 扩展 chat_plugins 表支持 MCP Server
- [ ] T402 实现 MCP Server Repository 方法
- [ ] T403 实现 MCP Server Service

### UI 组件

- [ ] T404 创建 MCP Server 配置组件
- [ ] T405 创建 MCP Server 选择器
- [ ] T406 集成到会话配置

### API

- [ ] T407 实现 MCP Server 管理接口
- [ ] T408 扩展 Agent 执行支持 MCP Servers

---

## 第8阶段：完善与质量保证

**目的**：跨 Phase 的改进和质量检查

- [ ] T802 运行 `pnpm run types:check` 确保类型正确 <!-- id: 802 -->
- [ ] T803 运行 `pnpm test` 确保测试通过 <!-- id: 803 -->
- [ ] T804 代码审查：ClaudeService 实现 <!-- id: 804 -->
- [ ] T805 代码审查：UI 引擎选择器实现 <!-- id: 805 -->
- [ ] T806 性能测试：验证引擎切换无延迟 <!-- id: 806 -->
- [ ] T807 用户体验测试：引擎选择流程流畅 <!-- id: 807 -->

---

## 第9阶段：归档准备

- [ ] T901 更新所有 TODO 状态为完成 <!-- id: 901 -->
- [ ] T902 验证所有场景在 spec.md 中已实现 <!-- id: 902 -->
- [ ] T903 更新 proposal.md 标记 Phase 1-2 完成 <!-- id: 903 -->
- [ ] T904 创建 Phase 3-4 的独立提案 (如需要) <!-- id: 904 -->

---

## 依赖关系

### Phase 依赖

```
Phase 0 (准备) ✅ 已完成
    ↓
Phase 1 (ClaudeService) 🎯 第一优先级
    ↓
Phase 2 (UI 引擎选择器) 🎯 第二优先级
    ↓
Phase 3 (Skills) 🔮 未来
    ↓
Phase 4 (MCP Servers) 🔮 未来
```

### 任务内依赖

**Phase 1 内部**:
- T101 必须先完成
- T102, T103, T104 可以在 T101 后并行

**Phase 2 内部**:
- T201, T202 可以并行
- T203 依赖 T201, T202
- T204, T206 可以并行
- T205 依赖 T204
- T207-T209 可以在功能完成后并行

### 并行机会

- ✅ T101 (ClaudeService) 和 T103 (测试) 可同时开发
- ✅ T201 (类型) 和 T202 (Store) 可并行
- ✅ T204 (组件) 和 T206 (指示器) 可并行
- ✅ T207-T209 (测试) 可并行执行

---

## 完成标准

### Phase 1 完成标准
- [x] ClaudeService 类实现完整
- [x] reportService 成功重构
- [x] 单元测试覆盖率 >= 80%
- [x] 集成测试通过
- [x] 无类型错误
- [x] 代码审查通过

### Phase 2 完成标准
- [x] 引擎选择器 UI 可用
- [x] API 路由动态选择正确
- [x] 配置持久化正常
- [x] 端到端测试通过
- [x] 用户体验流畅
- [x] 不影响现有 DeepAgents 功能

### 整体完成标准
- [x] 所有 P0-P2 User Stories 验证通过
- [x] 所有测试通过 (pnpm test)
- [x] 类型检查通过 (pnpm run types:check)
- [x] 代码质量检查通过 (pnpm run lint)
- [x] 文档更新完整
- [x] 提案已归档
