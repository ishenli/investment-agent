# 实现计划：Hermes Agent 权限系统（PermissionSystem）

**分支**：`sc-add-tool-security-guard` | **日期**：2026-05-09 | **规范**：[openspec/changes/add-tool-security-guard/specs/agent-management/spec.md](openspec/changes/add-tool-security-guard/specs/agent-management/spec.md)
**输入**：来自 GitHub Issue #78 + Claude Code 权限系统参考设计

## 概要

为 Hermes Agent 引入集中式权限系统（PermissionSystem），按 **PermissionLevel × ToolCategory** 策略矩阵决定工具执行策略（auto / confirm / deny），同时在内容层保留独立于权限级别的安全过滤（ContentGuard）。该设计大幅降低维护成本：新增工具只需声明一个 `ToolCategory`，无需逐一配置 permission/risk/confirmation 开关。

## 核心概念

```
PermissionLevel（谁）        ToolCategory（工具分类）
├── safe                      ├── read   (只读查询：stock_price, note_list)
├── standard (default)       ├── write  (数据写入：note_create, add_transaction)
├── power                     ├── system (系统操作：terminal)
└── unrestricted              └── finance (金融操作：add_transaction)

PermissionPolicy（策略矩阵）
              read    write   system   finance
safe          auto    auto    deny     deny
standard      auto    auto    confirm  confirm
power         auto    auto    confirm  auto
unrestricted  auto    auto    auto     auto

ContentGuard（内容层安全）
├── 即使 PermissionPolicy 输出 auto，仍做内容级过滤
├── terminal: 命令黑名单（rm -rf, sudo, curl | sh） + 工作目录白名单
└── patch: 路径白名单 + 敏感文件保护（.env, .git/）
```

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：@sinclair/typebox, @mariozechner/pi-ai
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Monorepo（packages/hermes-agent + src/server）
**性能目标**：权限校验 + 内容过滤需在 < 5ms 内完成，不引入 LLM 调用延迟
**约束条件**：
- `ToolRegistry.register()` 必须向后兼容（旧代码不传 `category` 时不报错，默认 `read`）
- 权限系统本身为纯函数，无状态，不依赖外部 IO
- 确认机制超时后自动拒绝，不能无限挂起 loop
- `db_query` 在 `safe` 和 `standard` 权限下必须拒绝（可绕过业务层直接访问数据库）

## 项目结构

### 文档

```text
openspec/changes/add-tool-security-guard/
├── proposal.md
├── plan.md
├── tasks.md
└── specs/
    └── agent-management/
        └── spec.md
```

### 源代码

```text
packages/hermes-agent/src/
├── permission/                     # 新增：权限系统
│   ├── types.ts                    # PermissionLevel, ToolCategory, ToolPolicy
│   ├── policy.ts                   # PermissionPolicy 策略矩阵实现
│   └── index.ts                    # 统一导出
├── guard/                          # 新增：内容安全守卫层
│   ├── content-validator.ts        # 命令/路径内容安全检查（非权限）
│   └── index.ts                    # 导出
├── builtin-tools/
│   ├── terminal.ts                 # MODIFIED：注册时 category='system'，handler 保留
│   ├── patch.ts                    # MODIFIED：注册时 category='write'，handler 保留
│   ├── index.ts                    # MODIFIED：registerBuiltins 传入 category
│   └── ...
├── tools.ts                        # MODIFIED：register() 增加 category
├── types.ts                        # MODIFIED：AgentConfig 加 permissionLevel，AgentCallbacks 加 onConfirmationRequest
├── loop.ts                         # MODIFIED：执行前检查 PermissionPolicy + ContentGuard + 确认机制
└── index.ts                        # MODIFIED：导出 permission 模块

src/server/core/agents/hermes/
└── registerBusinessTools.ts        # MODIFIED：每个 registry.register() 增加 category
```

**结构决策**：`permission/` 与 `guard/` 分离，使权限策略（谁可以做什么）与内容安全（命令/路径过滤）解耦。权限变更（如新增一个 PermissionLevel）不影响内容守卫逻辑。

## 技术架构

### 数据流

```
[LLM tool_call]
     ↓
ToolRegistry.execute(toolName, args, toolCallId)
     ↓
PermissionPolicy.evaluate(toolCategory, permissionLevel) → 'auto' | 'confirm' | 'deny'
     ↓
┌───────────────┴───────────────┐
deny                 auto / confirm
     ↓                        ↓
返回拒绝结果       ContentGuard.validate(toolName, args)
                        ↓
                   ┌────┴────┐
              拒绝              允许
                ↓                 ↓
        返回拒绝结果      confirm? 否 → 执行 handler
                        confirm? 是 → 暂停 loop
                                        ↓
                                  onConfirmationRequest?
                                        ↓
                              ┌─────────┴─────────┐
                           确认                    拒绝
                            ↓                       ↓
                        执行 handler           返回拒绝结果
```

### 状态管理

- **PermissionPolicy**：纯函数，无状态，每次调用传入 `(category, level)` 即可
- **PermissionLevel**：运行时在 `AgentConfig` 中配置，**不是代码写死的**（允许按 session / agent 动态变更）
- **ContentGuard**：无状态纯函数，支持环境变量覆盖规则
- **确认中断**：`loop.ts` 局部变量保存当前工具调用上下文，确认恢复后恢复执行

## 需求拆分

### User Stories

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | `safe` 权限下 `terminal` 被自动拒绝，无需确认 | 单元测试：`safe` + system → `deny` |
| P2 | `standard` 权限下写入/系统类工具需要用户确认 | 集成测试：`standard` + system → loop 暂停 |
| P3 | 危险命令（rm -rf）即使在 `power` 权限下也被内容过滤拦截 | 单元测试：`power` + `rm -rf /` → ContentGuard 拒绝 |
| P4 | `db_query` 在 `safe`/`standard` 下默认拒绝，防止原始 SQL 注入 | 单元测试：`db_query` 在各权限级别下的行为 |

## 复杂性跟踪

| 违规 | 为何需要 | 更简单的替代方案被拒绝的原因 |
|------|---------|----------------------------|
| 分离 `permission/` 和 `guard/` 目录 | 权限策略（谁）与内容安全（什么）是正交独立的两层，解耦后权限规则变化不影响内容过滤逻辑 | 合并会导致策略矩阵（如新增 permission level）和内容规则（如新增文件保护模式）相互干扰 |
| level 在 `AgentConfig` 中而非全局常量 | 允许运行时按 session / agent 动态调整权限级别，无需重启；Claude Code 的 `settings.json` 也是按会话级配置的 | 全局常量无法支持多 agent 场景（inbox agent vs 投资分析 agent 需要不同权限） |
| ContentGuard 独立于 PermissionSystem | ContentGuard 是"底线防守"——即使管理员将权限级别设为 `unrestricted`，基础安全过滤仍然存在。两层体系各自有自己的目的 | 没有 ContentGuard 的话，将 permission 设为 `unrestricted` 就完全裸奔 |

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 新增 `category` 参数遗漏导致新工具在 `safe` 下被允许 | 高 | `register()` 不传 `category` 时默认 `category: 'read'` + 开发模式 console.warn；review 清单：新增工具必须标注 category |
| 策略矩阵中的 `confirm` 导致 loop 无限暂停 | 高 | 超时 60s 自动拒绝；支持 `signal` 中止通道 |
| `db_query` 被标为 `system` 导致 high permission 也无法使用 | 中 | `power` 权限下 `system` 为 `confirm` 而非 `deny`，用户可确认执行；`unrestricted` 完全放行 |
| ContentGuard 命令正则被绕过（如 `sh -c 'rm -rf'`） | 中 | 命令做 tokenization 分析（基于 shell-quote or shlex），而非简单字符串匹配；提供 `HERMES_DISABLE_CONTENT_GUARD` 紧急开关 |

## 测试策略

- **单元测试**:
  - `permission/__tests__/policy.test.ts`：覆盖全部 4×4 策略矩阵组合
  - `guard/__tests__/content-validator.test.ts`：覆盖命令黑名单、路径白名单、敏感文件保护
  - `loop.test.ts`：模拟 confirm 场景，验证暂停/恢复/超时逻辑
- **集成测试**:
  - `registerBusinessTools.ts` 标注后运行全流程：确保权限检查不破坏现有工具调用
