# 任务：Agent Runtime Assets Settings

**输入**：来自 `openspec/changes/add-agent-runtime-assets-settings/specs` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`npm run types:check`
- 单元测试：`npm test`

**组织方式**：任务按阶段分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] 描述`
- **[P]**：可并行（不同文件，无依赖）

## 路径约定

| 类型 | 路径 |
|------|------|
| API Routes | `src/app/api/agent/runtime-assets/route.ts` |
| Service | `src/server/service/agentRuntimeAssetService.ts` |
| Controller | `src/server/controller/agentRuntimeAsset.ts` |
| Components | `src/app/(pages)/setting/agent/components/` |
| Types | `src/types/agentRuntimeAsset.ts` |

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-agent-runtime-assets-settings/` <!-- id: 0 -->
- [x] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [x] T02 编写 spec delta 规范变更 <!-- id: 2 -->
- [x] T03 运行 `openspec validate add-agent-runtime-assets-settings --strict` 验证 <!-- id: 3 -->

---

## 第1阶段：设置（基础设施）

**目的**：定义运行时资源模型和路径解析边界。

- [x] T004 在 `src/types/agentRuntimeAsset.ts` 中定义 runtime、asset type、list/detail/update 响应类型 <!-- id: 4 -->
- [x] T005 [P] 在 `src/server/service/agentRuntimeAssetService.ts` 中实现 allowlisted resolver 骨架 <!-- id: 5 -->
- [x] T006 [P] 为 Claude Code workspace 和 Hermes memory directory 定义解析策略，覆盖 Web dev 与 Electron userData 场景 <!-- id: 6 -->

---

## 第2阶段：基础（服务层）

**目的**：核心文件读写能力，必须在 UI 前完成。

- [x] T007 [P] 实现 Memory/User 文件枚举、读取、元数据返回 <!-- id: 7 -->
- [x] T008 [P] 实现 Memory/User Markdown 原子保存、大小限制、UTF-8 校验 <!-- id: 8 -->

**检查点**：业务逻辑就绪，可以开始 API/UI 实现。

---

## 第3阶段：API

- [x] T012 实现 `GET /api/agent/runtime-assets` 返回 Claude/Hermes runtime asset 列表和选中内容 <!-- id: 12 -->
- [x] T013 实现 `PUT /api/agent/runtime-assets` 保存 Memory/User Markdown 内容 <!-- id: 13 -->
- [x] T015 添加 Zod 请求验证、认证检查、错误码和日志记录 <!-- id: 15 -->

---

## 第4阶段：UI - 查看与编辑运行时文件

**目标**：用户能在 Agent 设置页查看和编辑 Claude Code 与 Hermes Agent 的 Memory/User 文件内容。
**独立测试**：打开 `/setting/agent`，直接看到运行时资源视图，能在 Claude/Hermes、Memory/User 间切换并显示内容；修改内容保存后刷新页面，内容仍为新值。

### 实现

- [x] T017 [P] 将 `src/app/(pages)/setting/agent/page.tsx` 重构为 Agent Runtime Assets 页面（直接渲染 AgentRuntimeAssetsView，无 Tabs） <!-- id: 17 -->
- [x] T018 [P] 创建 `AgentRuntimeAssetsView` 容器组件和 runtime/asset selector UI <!-- id: 18 -->
- [x] T022 [P] 创建 `RuntimeAssetEditor` Markdown 文本编辑组件 <!-- id: 22 -->
- [x] T023 添加 dirty state、保存、取消、保存中、保存成功提示 <!-- id: 23 -->
- [x] T024 添加保存冲突/失败错误展示和重新加载入口 <!-- id: 24 -->
- [x] T025 验证响应式布局和长内容滚动 <!-- id: 25 -->
- [x] T020 添加 loading、empty、not-found、read-only 状态 <!-- id: 20 -->

**检查点**：功能完整可用。

---

## 第5阶段：完善与质量保证

- [x] T031 更新 i18n 文案（zh-CN/en-US） <!-- id: 31 -->
- [x] T033 运行 `npm run types:check` 确保类型正确 <!-- id: 33 -->

---

## 第6阶段：范围缩减（已移除功能）

以下功能根据需求反馈已从本次变更中移除：

- [x] 移除 Agent Profiles 子视图（AgentProfilesView、AgentCard、AgentForm、AgentList、EmptyState 组件已删除） <!-- removed -->
- [x] 移除 Skills 编辑标签页（RuntimeSkillEditor 组件已删除，Skills 由 `/setting/skills` 独立管理） <!-- removed -->
- [x] 移除 skills-management spec delta <!-- removed -->
- [x] 更新 proposal.md、plan.md、tasks.md、spec.md 反映最终范围 <!-- removed -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置，阻塞 API/UI
- **API（第3阶段）**：依赖基础阶段
- **UI（第4阶段）**：依赖 API 读写就绪
- **完善（第5阶段）**：依赖 UI 完成
