# report-editing Spec Delta

## ADDED Requirements

### Requirement: Report Content Update
系统 MUST 支持更新已生成报告的内容，允许用户手动编辑 AI 生成的周报。

#### Scenario: Start Editing Report
- **GIVEN** 用户已登录并查看报告详情页
- **WHEN** 用户点击"编辑报告"按钮
- **THEN** 系统 必须（MUST）打开编辑抽屉（Drawer）
- **THEN** 编辑抽屉 必须（MUST）从屏幕右侧滑入
- **THEN** 编辑抽屉 必须（MUST）预填充当前报告内容（Markdown 格式）
- **THEN** 编辑抽屉 必须（MUST）提供全屏的 Markdown 文本编辑区域

#### Scenario: Edit Report Content
- **GIVEN** 编辑抽屉已打开
- **WHEN** 用户修改报告内容
- **THEN** 系统 MUST 保持 Markdown 格式完整性
- **THEN** 系统 MUST 在关闭抽屉前提示用户是否要保存尚未保存的更改

#### Scenario: Save Edited Report
- **GIVEN** 用户已在编辑抽屉中修改了报告内容
- **WHEN** 用户点击"保存"按钮
- **THEN** 系统 必须（MUST）验证内容不为空
- **THEN** 系统 必须（MUST）调用 PATCH `/api/report/[id]` API 更新报告
- **THEN** 系统 必须（MUST）使用当前用户的账户 ID 进行权限验证
- **THEN** 系统 必须（MUST）显示保存成功的提示（toast）
- **THEN** 系统 必须（MUST）关闭编辑抽屉
- **THEN** 系统 必须（MUST）刷新报告详情页显示最新内容

#### Scenario: Cancel Editing
- **GIVEN** 用户已在编辑抽屉中修改了报告内容
- **WHEN** 用户点击"取消"按钮
- **THEN** 系统 必须（MUST）如果内容已修改，显示确认对话框询问是否放弃更改
- **THEN** 系统 必须（MUST）如果用户确认放弃，关闭编辑抽屉
- **THEN** 系统 必须（MUST）如果用户取消放弃，保持编辑抽屉打开
- **THEN** 初始报告内容不得（MUST NOT）被修改

#### Scenario: Edit Report API Endpoint
- **GIVEN** 用户已获得身份验证 token
- **WHEN** 用户发送 PATCH 请求到 `/api/report/[id]`，请求体包含 `{ content: string }`
- **THEN** 系统 必须（MUST）验证 token 获取用户账户信息
- **THEN** 系统 必须（MUST）验证用户有权限编辑该报告（报告所属账户与用户账户匹配）
- **THEN** 系统 必须（MUST）验证 reportId 有效且对应的报告存在
- **THEN** 系统 必须（MUST）验证 content 字段不为空且符合 Markdown 格式（基础验证）
- **THEN** 系统 必须（MUST）更新 `analysis_reports` 表中对应报告的 `content` 字段
- **THEN** 系统 必须（MUST）返回成功响应包含更新后的报告详情
- **THEN** 系统 必须（MUST）返回 HTTP 200 状态码

#### Scenario: Edit Report API Error Handling
- **GIVEN** 用户尝试更新报告
- **WHEN** 用户未登录或 token 无效
- **THEN** 系统 必须（MUST）返回 HTTP 401 错误
- **THEN** 错误消息 必须（MUST）包含错误码 `UNAUTHORIZED`
- **WHEN** 报告ID 不存在
- **THEN** 系统 必须（MUST）返回 HTTP 404 错误
- **THEN** 错误消息 必须（MUST）包含错误码 `REPORT_NOT_FOUND`
- **WHEN** 用户没有权限编辑该报告
- **THEN** 系统 必须（MUST）返回 HTTP 403 错误
- **THEN** 错误消息 必须（MUST）包含错误码 `FORBIDDEN`
- **WHEN** content 字段为空
- **THEN** 系统 必须（MUST）返回 HTTP 400 错误
- **THEN** 错误消息 必须（MUST）包含错误码 `INVALID_CONTENT`

#### Scenario: Update Report Service Method
- **GIVEN** reportService 实例
- **WHEN** 调用 `reportService.updateReportContent(reportId, accountId, newContent)`
- **THEN** 系统 必须（MUST）查询数据库验证报告存在且属于指定账户
- **THEN** 系统 必须（MUST）更新报告的 content 字段
- **THEN** 系统 必须（MUST）记录更新操作的日志
- **THEN** 系统 必须（MUST）返回更新后的报告详情
- **WHEN** 报告不存在或权限不足
- **THEN** 系统 必须（MUST）返回 null 或抛出适当错误

#### Scenario: UI Edit Button Visibility
- **GIVEN** 用户查看报告详情页
- **WHEN** 报告加载成功
- **THEN** 系统 必须（MUST）在报告详情页标题区域显示"编辑报告"按钮
- **THEN** "编辑报告"按钮 必须（MUST）与"删除报告"按钮并排显示
- **THEN** 按钮 必须（MUST）使用一致的 UI 样式（secondary 或 outline variant）

#### Scenario: Edit Dialog Component
- **GIVEN** EditReportDialog 组件被渲染
- **WHEN** 组件初始化
- **THEN** 组件 必须（MUST）接收 props：`open`, `onOpenChange`, `reportId`, `initialContent`, `onUpdate`
- **THEN** 组件 必须（MUST）使用 Drawer 组件封装
- **THEN** 组件 必须（MUST）包含文本编辑区域（Textarea）
- **THEN** 组件 必须（MUST）包含"保存"和"取消"按钮
- **THEN** 组件 必须（MUST）在保存前显示加载状态
- **THEN** 组件 必须（MUST）处理保存成功和失败的情况

---

### Requirement: Report Service Public Update Content Method
reportService MUST provide a public `updateReportContent` method that supports updating report content with access control.

#### Scenario: Expose Update Method
- **GIVEN** reportService 类定义
- **WHEN** 需要通过 API 更新报告内容
- **THEN** `updateReportContent` 方法 必须（MUST）是 public 方法
- **THEN** 方法 必须（MUST）接收 `reportId`, `accountId`, `content` 三个参数
- **THEN** 方法 必须（MUST）验证报告存在且属于指定账户
- **THEN** 方法 必须（MUST）返回 `Promise<ReportDetail | null>`

---

## Implementation Notes

### API Endpoint

**PATCH `/api/report/[id]`** Request:
```typescript
{
  content: string; // Updated markdown content
}
```

**Response:** Updated `ReportDetail` object

### Database Updates

No schema migration needed. The `analysisReports.content` field already exists.

### File Structure Changes

**Added:**
```
src/app/(pages)/report/[id]/components/
└── EditReportDrawer.tsx         # NEW: Markdown editor drawer
```

**Modified:**
```
src/app/(pages)/report/[id]/
└── report-detail.tsx             # ADD: Edit button, EditReportDrawer integration

src/app/api/report/[id]/
└── route.ts                      # ADD: PATCH endpoint

src/server/service/
└── reportService.ts              # MOD: Expose updateReportContent method
```

### UI Components Required

The solution uses:

1. **Textarea** component from existing `@renderer/components/ui/textarea`
2. **Drawer component** from existing `@renderer/components/ui/drawer` - slides in from right side
3. No live preview - simpler implementation focused on editing experience

Key design decisions:
- Full-height drawer provides maximum editing space
- No swipe/ESC close prevents accidental closure
- External click disabled to prevent data loss
- Explicit Save/Cancel actions required