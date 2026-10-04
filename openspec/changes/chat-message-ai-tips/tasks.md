# Tasks

## 1. 服务端:相关追问生成助手

- [x] 1.1 新建 `src/server/service/followUpService.ts`,实现 `generateFollowUpQuestions({ model, provider, messages, finalReply })`:投资域门复用 `ReflectionAuditor.isDomainRelevant()`(实例化 auditor 调用),域内用 pi-ai `complete`(`@earendil-works/pi-ai/compat`)生成 JSON 数组;解析结果截断到 ≤3 条;域外、解析失败、模型调用异常或超时均返回空数组(fail-soft),不抛出。验证:`src/server/service/__tests__/followUpService.test.ts` 通过——覆盖①投资域生成 1–3 条、②非投资域返回空、③malformed JSON 返回空、④模型异常返回空、⑤超过 3 条被截断为 3。
- [x] 1.2 导出 service 单例并暴露给路由层使用,单元测试验证导出形式与 1.1 一致 (followUpService 具备 `default` 单例导出)。

## 2. 服务端:对话设置开关接入

- [x] 2.1 在 `src/server/controller/setting.ts` 的 `SettingKeySchema` 枚举中加入 `CHAT_AI_TIPS_ENABLED`。验证:扩展 `src/server/controller/__tests__/setting.test.ts`,断言白名单外的键校验失败、新键合法写入成功。
- [x] 2.2 新增 `src/app/(pages)/setting/conversation/page.tsx`(「对话设置」)及 `settings-sidebar.tsx` 入口:页内 Switch 读取 `CHAT_AI_TIPS_ENABLED`(`GET /api/setting`),切换时经 `PUT /api/setting` 持久化,未配置时显示开启。验证:页面组件测试覆盖加载态回显、切换后调用 PUT;并 `pnpm lint` / types 通过。

## 3. 服务端:路由接入并发出 related 事件

- [x] 3.1 hermes 路由接入:在 `runEngine` 完成拿到 `result.content` 后、`sendDone()` 前,先读 `CHAT_AI_TIPS_ENABLED`(关闭则跳过),再按域调用 `followUpService.generateFollowUpQuestions` 并对非空 items 执行 `sseEmitter.sendRelated(items)`,失败不阻塞主回复。验证:扩展 hermes 路由相关测试/新增对收尾逻辑的测试,断言 `related` 事件(若存在)出现在 `done` 之前且 items ≤3、开关关闭时不发 `related`。
- [x] 3.2 claude 路由接入:捕获 `runEngine` 的 `result`(当前未捕获),同样在读开关通过后调用 helper 并 `sendRelated(items)`,失败不阻塞主回复。验证:扩展 claude 路由测试,断言 `related` 事件在 `done` 前、items ≤3、生成失败或开关关闭时主回复不受影响。

## 4. 前端:放宽渲染 gate

- [x] 4.1 修改 `src/app/(pages)/chat/features/Conversation/Messages/Assistant/BelowMessage.tsx`:把 `isLastAssistant`(仅最新一条)放宽为"该消息 `role === 'assistant'` 且 `related` 非空"即渲染,`slice(0, 3)` 与点击填输入框 + `sendMessage` 行为保持不变。验证:同目录新建 `__tests__/` 组件测试通过——①两条带 `related` 的 assistant 消息都渲染面板、②无 `related` 或空数组不渲染、③超过 3 条只显示前 3、④点击建议填入输入框并发送。

## 5. 集成验证

- [ ] 5.1 全链路冒烟:dev server 起,发起投资域对话确认最后一条及历史 assistant 消息下方均出现 ≤3 条可点击追问;非投资域对话不出现追问;在「对话设置」关闭开关后新消息不再显示追问、重新开启后恢复。验证:`npm run types:check`、`npm test`(相关测试)、`npm run lint`(改动文件)通过,并记录冒烟结果。