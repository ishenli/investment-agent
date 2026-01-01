# AI 智能投资周报 —— 产品需求文档 (PRD)

## 1. 功能概述

**AI 智能投资周报** 旨在通过 AI 自动分析用户本周的持仓变化、市场动态及个人笔记，生成一份集**业绩复盘、信息回顾、策略建议**于一体的深度报告。

帮助投资者：
- **量化复盘**：清晰看到本周盈亏归因。
- **信息闭环**：将散落在“市场信息”、“个人笔记”中的碎片化信息与行情结合分析。
- **风险预警**：基于价格波动与宏观信息，提示潜在风险。

---

## 2. 核心价值

1.  **自动化**：无需手动统计，自动聚合价格、交易、笔记、新闻数据。
2.  **深度洞察**：AI 不仅仅是罗列数据，而是寻找“价格变化”与“市场信息”之间的因果联系。
3.  **行动导向**：报告结尾提供具体的调仓或关注建议。

---

## 3. 数据来源与聚合逻辑

周报生成需要聚合以下四类核心数据（时间范围：本周一 00:00 至 周日 23:59）：

### 3.1 资产价格与持仓数据
*   **数据表**：`assetPositions` (当前持仓), `assetMeta` (价格历史), `transactions` (本周交易)
*   **分析维度**：
    *   本周总资产净值变化（金额 & 百分比）。
    *   持仓个股/ETF 的周涨跌幅排行榜 (Top 5)。
    *   本周新建仓或清仓的操作记录。

### 3.2 市场情报 (Market Info)
*   **数据表**：`assetMarketInfo`
*   **筛选规则**：
    *   `updatedAt` 在本周内的记录。
    *   重点关注 `marketImpact` (市场影响) 和 `sentiment` (情绪) 字段。
    *   关联持仓：优先展示用户持仓相关的市场信息。

### 3.3 个人投研笔记 (Notes)
*   **数据表**：`notes`
*   **筛选规则**：
    *   `createdAt` 在本周内的笔记。
    *   提取笔记中的 `tags` 和 `content` 摘要，作为用户本周关注焦点的输入。

### 3.4 宏观/公司基本面 (Context)
*   **数据表**：`assetCompanyInfo` (如有更新), `assetMeta.investmentMemo` (最新的投资逻辑)
*   **作用**：为 AI 提供长期投资逻辑的背景，判断本周波动是否偏离了长期逻辑。

---

## 4. 功能详情

### 4.1 周报生成器 (AI Generator)

*   **触发方式**：
    *   **自动推送**：每周一上午 09:00 (可配置)。
    *   **手动触发**：用户在“报表/周报”页面点击“生成本周报告”。
*   **AI 输入 Prompt 结构**：
    ```text
    Role: 专业的投资顾问
    Task: 生成本周投资周报
    Context:
    1. 持仓表现: [JSON: 资产列表, 周涨跌幅, 交易记录]
    2. 市场关键信息: [JSON: assetMarketInfo 列表 (摘要 + 情绪)]
    3. 用户笔记: [JSON: 本周笔记内容]
    4. 长期逻辑: [JSON: 核心持仓的 investmentMemo]
    
    Output Requirement:
    - 语气专业、客观。
    - 重点分析：为何涨/跌？（关联 Market Info）
    - 风险提示：基于本周信息，哪些持仓面临新的风险？
    - 格式：Markdown
    ```

### 4.2 周报展示 UI

报告以 Markdown 渲染，包含以下板块：

#### A. 市场与账户概览 (Overview)
*   **关键指标卡片**：本周收益率、跑赢/跑输基准（如标普500/沪深300）、最大回撤。
*   **一句话点评**：AI 生成的本周总结（例如：“本周科技股回调导致净值回撤，但医疗板块表现稳健...”）。

#### B. 持仓异动分析 (Movers & Shakers)
*   **领涨/领跌资产**：列出 Top 3，并附带 AI 对其波动的解释（引用 `assetMarketInfo`）。
    *   *Examples*: "NVDA (+5%): 受周三发布的财报超预期影响..."

#### C. 信息与笔记回顾 (Insights)
*   **本周焦点**：梳理用户本周记录的 `notes` 和系统抓取的 `assetMarketInfo`，按主题聚类。
    *   *Tag*: #宏观 #美联储 #加息
*   **逻辑验证**：AI 检查本周的新信息是否挑战了 `investmentMemo` 中的原始投资逻辑。

#### D. 下周展望与建议 (Outlook)
*   **关注事项**：下周即将发生的财经日历（需接入日历数据或作为后续规划）。
*   **操作建议**：基于风险暴露（如集中度过高、相关性过强 -> 参考 `ai-position-manager-v2.md` 的逻辑），给出调仓建议。

---

## 5. 技术实现方案

### 5.1 数据聚合层 (Service Layer)
需新增 `WeeklyReportService`：
1.  **getWeeklyPerformance(accountId)**: 计算收益率。
2.  **getWeeklyEvents(accountId)**: 拉取 `transactions`, `assetMarketInfo`, `notes`。
3.  **formatReportContext()**: 将上述数据清洗为 LLM Token 高效的格式。

### 5.2 存储设计
新增 `analysis_reports` 表用于存储生成的周报历史：
```typescript
export const analysisReports = sqliteTable('analysis_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  type: text('type').notNull().default('weekly'), // weekly, monthly, emergency
  title: text('title').notNull(),
  content: text('content').notNull(), // Markdown 内容
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

---

## 6. 交互流程 (User Flow)

1.  **入口**：侧边栏 -> "智能周报"。
2.  **列表页**：展示历史周报卡片（按周排列）。
3.  **详情页**：
    *   左侧/顶部：Markdown 报告正文。
    *   右侧/浮层：引用的“数据源”快照（点击报告中的链接，可查看当时的具体的 Note 或 MarketInfo 原文）。
4.  **生成过程**：
    *   点击“生成” -> Loading (显示 "AI 正在分析本周持仓...", "AI 正在阅读您的笔记...") -> 展示结果。

---

## 7. 后续规划 (Roadmap)

*   **V1.0**: 基础版 - 手动触发，基于静态数据的文本分析。
*   **V1.1**: 图表增强 - 报告中嵌入动态图表（收益曲线、持仓饼图）。
*   **V1.2**: 发送渠道 - 支持邮件推送到用户邮箱。
