# 实现计划：飞书文本会话渠道

**分支**：`feishu` | **日期**：2026-08-23 | **规范**：`openspec/changes/add-feishu-channel/specs/feishu-channel/spec.md`
**输入**：当前仓库飞书原型、微信渠道服务层，以及 CodePilot `src/lib/channels/feishu/` 的生产实现

## 概要

使用现有依赖 `@larksuiteoapi/node-sdk` 建立飞书企业自建应用 WebSocket 长连接。飞书 adapter 只负责 SDK 生命周期、文本事件归一化、访问策略、去重和静态 Markdown 卡片发送；服务层负责会话、持久化、同会话串行和 Hermes `runEngine` 调用。该边界复用当前项目已有的 `ChannelMessage`、chat storage 和 engine，不移植 CodePilot 的通用 Bridge 编排器或流式卡片/媒体子系统。

## 技术上下文

**语言/版本**：TypeScript 5.9 / Node.js >= 20
**主要依赖**：Next.js 16, `@larksuiteoapi/node-sdk` 1.62, Hermes `runEngine`, Drizzle ORM
**存储**：现有 SQLite settings、chat sessions、chat messages
**测试**：Vitest, TypeScript strict mode
**目标平台**：长驻 Node.js 服务端（Web 与 Electron 内嵌 Next.js server；不支持 serverless request lifecycle）
**项目类型**：pnpm workspace + Next.js App Router
**性能目标**：飞书事件回调只做同步校验与入队；不等待 Agent；同一会话串行、不同会话并行
**约束条件**：首期仅接收文本，最终回复使用单张非流式 Markdown 卡片；无公网回调地址；不新增依赖；App Secret 不得明文回传或写日志；自动注册失败时保留手工凭据配置

## 规范检查

- 符合 `openspec/project.md` 的 TypeScript、Zod、SQLite 与安全约束
- `openspec/agent/memory/constitution.md` 当前为未填写模板，无额外治理要求
- 使用现有 SDK、engine、setting service 与 chat storage，不引入新框架
- Delta 使用 ADDED Requirements，所有 requirement 均包含 Scenario
- 用户已明确“没有技术卡点可直接实现”；本提案严格校验通过后视为该范围的实施授权

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-feishu-channel/
├── proposal.md
├── plan.md
├── tasks.md
└── specs/
    └── feishu-channel/
        └── spec.md
```

### 源代码（项目根目录）

```text
packages/agent-channel/src/feishu/
├── feishu-ws-channel.ts              # 官方 SDK gateway、策略、去重、归一化、发送
├── feishu-markdown.ts                # 静态 Markdown 卡片、空回复兜底和长度限制
├── message-adapter.ts                # SDK event 到 ChannelMessage 的文本归一化
└── __tests__/                        # adapter、归一化和卡片单测

src/server/channel/
├── feishuChannelTask.ts              # 生命周期、队列消费、会话和持久化
├── feishuConfig.ts                   # 配置读取、校验和 secret 状态投影
├── feishuAppRegistration.ts          # PersonalAgent device flow 和本地配对
├── hermesChannelHandler.ts           # 按 platform 复用的 Hermes channel handler
├── types.ts                          # 通用 handler contract 和微信兼容类型别名
└── __tests__/                        # task、配置、注册和 handler 单测

src/app/api/channel/feishu/
├── route.ts                          # 配置状态、保存、启停/重启，不再接收 webhook
├── register/route.ts                 # start/poll/cancel 单用户注册 API
└── __tests__/                        # 配置及注册 API 单测

src/app/(pages)/setting/channel/components/
├── FeishuConfigTab.tsx               # 配置表单和连接状态
└── FeishuAppRegistration.tsx         # 二维码、授权链接、轮询和取消
```

**结构决策**：沿用仓库已有 `agent-channel -> server/channel task -> runEngine` 三层结构。`ChannelAgentHandler` 与按 `platform` 构造的 `HermesChannelHandler` 已由微信和飞书共同使用，只共享最终 Agent 调用契约；CodePilot 的 adapter registry、delivery layer、permission broker 和 DB binding 不复制，因为当前应用已经有单一 Agent runtime、chat storage 和 channel session 映射。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 授权用户可通过飞书私聊获得 Hermes Markdown 卡片回复 | 模拟合法 `open_id` 文本事件，验证入队、会话持久化和卡片回复 |
| P1 | 授权群仅在 @Bot 时获得回复 | 分别模拟未 @、错误 chat_id、合法 @ 三种事件 |
| P2 | 管理员可安全配置并启停飞书渠道 | API/UI 验证 secret 不回显、配置校验、保存后重启和连接状态展示 |
| P2 | 管理员可扫码授权创建飞书 Bot 并自动完成本人私聊准入 | 模拟 device flow，验证 session 归属、本地凭据存储、授权人 allowlist、Bot 校验和尽力重启 |
| P2 | 重复事件和并发消息不产生重复/乱序会话 | 模拟重复 `message_id` 与同/不同 chat 并发事件 |

## 技术架构

### 数据流

```text
Feishu WS event
  -> FeishuWSChannel: validate text + allowlist + @Bot + dedupe
  -> in-memory handoff (SDK handler returns immediately)
  -> feishuChannelTask per-channel promise chain
  -> existing chat session/history persistence
  -> shared HermesChannelHandler -> runEngine('hermes')
  -> FeishuWSChannel.replyMessage() as one interactive Markdown card
```

adapter 通过 `FeishuWSChannel.start(handler)` 注册回调，并以 `queueMicrotask` 交付归一化后的 `ChannelMessage`；SDK 原始 event 不越过该边界。task 立即按 `channelId` 挂入 Promise chain，单条消息的异常在 `processMessage` 内记录并转换为错误回复，因此失败不会让后续同会话消息停滞。

```text
Settings QR / authorization link
  -> single-user registration API using the server-selected default user
  -> accounts.feishu.cn PersonalAgent device flow
  -> owner-bound registration session + adaptive polling
  -> verify tenant_access_token + bot.info
  -> locally stored App Secret + authorizer open_id allowlist
  -> best-effort restart Feishu channel; completed session may carry restartError
```

### 状态管理

- **服务端**：模块级单例保存 active channel、启动 Promise、配置 hash、会话缓存和每会话 Promise chain。
- **注册会话**：模块级 Map 保存 owner、device code、过期时间、轮询间隔和终态；session ID 使用 `crypto.randomUUID()`，终态及超时会话自动清理。
- **客户端**：继续使用渠道设置页局部 React state，不增加全局 Zustand store。
- **缓存策略**：每个 active channel 实例按 `message_id` 做 10 分钟内存 TTL 去重（容量触发清理）；stop、配置重启和进程重启都会清空该状态。session slug 到 session ID 使用进程内缓存。

### 外部集成

- **Feishu SDK**：`WSClient` 接收 `im.message.receive_v1`，`Client` 获取 bot identity 与回复消息；SDK 负责 ping 与自动重连。
- **App Registration**：调用飞书官方 CLI 同源的 `accounts.feishu.cn/oauth/v1/app/registration`；`tenant_brand=lark` 时切换 Lark 轮询和 Open API 域名。
- **Hermes**：通过现有 `runEngine('hermes')` 运行，平台标识为 `feishu`。
- **数据库**：复用 settings、chat sessions、chat messages；不新增表或迁移。

## 复杂性跟踪

无必须证明的架构违规。应用按本地单用户威胁模型直接在 SQLite settings 中保存 App Secret，不引入额外密钥管理；仍允许直接使用 `FEISHU_APP_SECRET` 环境变量。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SDK 连接状态只能在当前进程内观测 | 中 | `running` 仅在 SDK 回调状态为 connected 时为真；错误由 SDK/logger 记录，不自制空闲探测 |
| Bot identity 获取失败导致无法精确识别 @ | 中 | 群聊门禁 fail-closed；私聊继续可用；启动日志给出一次警告，恢复群聊需手动保存或重启渠道 |
| stop、配置重启或进程重启会清空内存去重 | 低 | 10 分钟保证仅适用于同一 active channel 实例；首期不新增持久化表，后续有跨实例重复证据再升级 |
| 本地数据库被复制 | 低 | 产品假设个人电脑由操作系统和用户账户保护；Secret 仍不进入 API 响应或日志 |
| 无真实飞书凭据的 CI | 中 | SDK/REST client mock 覆盖；设置页仅展示 SDK 连接状态，真实连通性由人工 smoke 验证 |
| App Registration API 或租户策略不可用 | 中 | 保留手工 App ID/App Secret 配置；错误只返回稳定错误码，不回传凭据或上游响应正文 |
| 单用户配置/注册 API 无 cookie 或 Bearer 鉴权 | 高 | 仅适用于受信任的本地或私有部署边界；暴露给非受信任网络前必须增加部署级访问控制 |
| 注册 session 被猜测或串用 | 高 | session ID 使用不可预测随机值并绑定服务端默认应用用户；终态和超时 session 自动清理 |
| 自动注册的实际权限由 PersonalAgent 模板决定 | 中 | 手工配置路径文档使用三项消息权限；自动注册不宣称代码能进一步约束或校验模板权限 |
| 自动注册已落库但渠道重启失败 | 中 | session 仍返回 completed 和 `restartError`；设置页提示手动保存或重启 |
| Agent 回复预览进入应用日志 | 中 | 当前 handler 会记录前 60 个字符；日志文件需按本地敏感数据管理，后续应改为仅记录运行元数据 |

## 性能考虑

- SDK 事件回调不等待 DB、Agent 或发送 API。
- 同一 `channelId` 串行以保护会话顺序；不同 `channelId` 并行。
- 去重 Map 仅在超过 1,000 项时清理过期项。

## 安全考虑

- 私聊只匹配 sender `open_id`；群聊只匹配原始 `chat_id` 且必须 @当前 Bot。
- App Secret 不进入响应、不进入配置 hash 日志、不进入错误消息。
- 注册返回的 client secret 只在服务端用于验证和本地落库，从不返回浏览器；注册 session 使用不可预测 ID 并绑定服务端默认应用用户。
- App Secret 按本地单用户威胁模型直接存入 SQLite，不要求用户管理额外加密密钥。
- 非文本、空消息、机器人自身消息、未授权消息均静默丢弃。

## 测试策略

- **单元测试**：文本解析、@剥离、白名单、群聊 fail-closed、实例内重复消息、Markdown 卡片格式/截断、secret 本地持久化与 replacement 语义、公开状态投影、API 不回传 secret 和日志脱敏。
- **集成测试**：模拟 SDK 回调验证快速入队、同会话顺序、session/message 持久化、卡片回复，以及注册完成后的成功重启与重启警告。
- **端到端测试**：需要真实企业自建应用凭据，作为人工 smoke，不纳入默认 CI。
