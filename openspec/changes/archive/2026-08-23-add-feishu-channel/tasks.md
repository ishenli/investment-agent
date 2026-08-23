# 任务：飞书文本会话渠道

**输入**：`openspec/changes/add-feishu-channel/specs/feishu-channel/spec.md`
**前置条件**：`plan.md`
**参考**：`openspec/project.md`

**测试**：
- 包类型检查：`pnpm --filter @investment-agent/agent-channel typecheck`
- 全仓类型检查：`pnpm types:check`
- 定向单测：`pnpm vitest run <feishu test files>`

**组织方式**：任务按可独立验收的 User Story 排列；P1 先形成可运行文本链路，P2 再完成配置与运行时管理。

## 第0阶段：规范与基线

- [x] T001 创建 `add-feishu-channel` proposal、plan、tasks 和 capability delta <!-- id: 1 -->
- [x] T002 运行 `openspec validate add-feishu-channel --strict` 并修复全部错误 <!-- id: 2 -->
- [x] T003 记录当前类型检查基线及依赖安装前提 <!-- id: 3 -->

---

## 第1阶段：User Story 1 - 私聊文本会话 (P1)

**目标**：允许配置的飞书 `open_id` 可通过 WebSocket 发送文本并收到 Hermes Markdown 卡片回复。
**独立测试**：模拟 SDK 私聊事件，验证事件回调快速返回、消息在 active channel 实例内仅处理一次、会话及双向消息落库、回复以静态 Markdown 卡片引用原消息。

- [x] T004 [US1] 精简 `packages/agent-channel/src/feishu/feishu-ws-channel.ts`，使用官方 SDK 管理连接、归一化文本、发送静态 Markdown 卡片并强制关闭旧连接 <!-- id: 4 -->
- [x] T005 [P] [US1] 在 `packages/agent-channel/src/feishu/__tests__/` 添加解析、私聊白名单、active channel 实例内 `message_id` 去重和 Markdown 卡片单测 <!-- id: 5 -->
- [x] T006 [US1] 新增按 `platform` 构造的 `HermesChannelHandler`，将 `src/server/channel/types.ts` 提炼为跨 channel 契约，并保留微信类型兼容别名 <!-- id: 6 -->
- [x] T007 [US1] 新增 `src/server/channel/feishuChannelTask.ts`，复用 chat storage、session repository 和 `runEngine` 完成消息处理 <!-- id: 7 -->
- [x] T008 [US1] 在 `src/instrumentation.ts` 非阻塞、幂等启动飞书任务 <!-- id: 8 -->

---

## 第2阶段：User Story 2 - 群聊安全门禁 (P1)

**目标**：仅允许配置的 `chat_id`，且消息明确 @当前 Bot 时才进入 Agent。
**独立测试**：未授权群、未 @Bot、Bot identity 未解析、合法群 @Bot 四类事件分别得到丢弃、丢弃、丢弃、入队结果。

- [x] T009 [US2] 通过 bot info 文档端点解析 Bot `open_id`，群聊 identity 未就绪时 fail-closed <!-- id: 9 -->
- [x] T010 [US2] 实现群 `chat_id` 白名单、`mentions` 精确匹配和 Bot mention 文本剥离 <!-- id: 10 -->
- [x] T011 [P] [US2] 添加群聊策略与不同会话并发测试 <!-- id: 11 -->

---

## 第3阶段：User Story 3 - 安全配置与生命周期 (P2)

**目标**：管理员可配置、验证、启停和重启飞书渠道，secret 仅在本地持久化且不通过 API 或日志泄漏。
**独立测试**：GET 不含 secret；secret PUT 直接写入本地设置并重启渠道；重复 direct start 且有效配置未变时不重启，显式 restart 强制关闭旧 WS。

- [x] T012 [US3] 新增 Feishu 配置读取/校验与本地 secret 存储 <!-- id: 12 -->
- [x] T013 [US3] 将 `src/app/api/channel/feishu/route.ts` 改为配置状态及启停 API，移除 webhook 处理职责 <!-- id: 13 -->
- [x] T014 [US3] 扩展 `src/server/controller/setting.ts` 的飞书 enable/allowlist keys，禁止通用设置接口回传 App Secret <!-- id: 14 -->
- [x] T015 [US3] 更新 Feishu 设置 UI 为 WebSocket、enable、App ID、secret replacement、用户/群白名单与连接状态展示 <!-- id: 15 -->
- [x] T016 [P] [US3] 同步 `src/locales/zh-CN/setting.json` 与 `src/locales/en-US/setting.json` <!-- id: 16 -->
- [x] T017 [P] [US3] 添加 secret API 与生命周期单元测试 <!-- id: 17 -->

---

## 第4阶段：User Story 4 - 自动注册与创建者配对 (P2)

**目标**：管理员通过浏览器或二维码授权创建 PersonalAgent Bot，凭据安全落库并自动将授权人加入私聊白名单。
**独立测试**：模拟 begin/poll 成功、pending、slow_down、拒绝、过期、默认应用用户归属和 Lark 回切；验证 secret 不进入 API 响应，成功后尽力重启，并在重启失败时返回公开警告。

- [x] T018 [US4] 新增 owner-bound App Registration session、begin/poll/cancel、Lark 回切、Bot 验证、本地落库和重启警告 <!-- id: 18 -->
- [x] T019 [US4] 新增使用默认应用用户的单用户注册 API，并确保任何响应均不含 device code 或 App Secret <!-- id: 19 -->
- [x] T020 [US4] 在飞书设置页加入本地二维码、授权链接、轮询/取消状态和自动刷新配置 <!-- id: 20 -->
- [x] T021 [P] [US4] 添加注册服务与 API 单测，覆盖成功、等待、错误、session ownership 和 secret 边界 <!-- id: 21 -->

---

## 第5阶段：质量门禁与交付

- [x] T022 运行定向 Feishu 单测并修复失败 <!-- id: 22 -->
- [x] T023 运行 `pnpm --filter @investment-agent/agent-channel typecheck` <!-- id: 23 -->
- [x] T024 运行 `pnpm types:check` 与受影响 lint <!-- id: 24 -->
- [x] T025 核对 spec 全部场景并将完成任务更新为 `[x]` <!-- id: 25 -->
- [x] T026 补充自动注册已落库但渠道重启失败时的 `restartError` 回归测试 <!-- id: 26 -->

## 依赖关系

- T002-T003 完成后进入实现。
- T004 是 T007、T009、T010 的基础；T006 先于 T007。
- T012 先于 T013-T015；T007 和 T013 共同完成运行时启停。
- T005、T011、T016 可在对应实现任务后独立执行。
- T018 先于 T019-T020；T021 可在 T018-T019 后独立执行。
- T022-T025 依赖所有纳入本次交付的 P1/P2 任务；T026 是 review 后识别的测试缺口。
