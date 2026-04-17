# Change: 添加人民币基金资产支持

## Why

当前系统支持 stock/etf/fund/crypto 四种资产类型和 US/CN/HK 三个市场，但缺乏对中国大陆基金（以人民币计价）的完整支持链路。用户需要将人民币基金作为持仓的一部分进行管理，包括买入/卖出交易、自动价格获取、以及在总资产中以可切换的币种视角展示。

## What Changes

1. **价格获取**：扩展腾讯适配器（TencentAdapter），支持基金代码的价格抓取（如天天基金/腾讯基金接口），基金净值以人民币存储
2. **交易流程**：基金交易沿用"数量x单价"模式，currency 字段标记为 CNY
3. **持仓展示**：基金持仓以人民币原始计价展示市值和盈亏，同时提供美元换算值
4. **资产汇总（币种切换展示）**：总资产页面提供 USD/CNY 币种切换器，用户可在两种币种视角之间切换查看所有资产（所有金额统一转换为所选币种展示）
5. **UI 布局优化**：资产概览采用紧凑的单行四卡片布局（总余额、现金余额、股票资产、基金资产），币种切换器提升至页面级别与刷新按钮并列

## Impact

- Affected specs: `price-fetcher`, `transaction`, `revenue-analytics`
- Affected code:
  - `src/server/service/unifiedPriceService/adapters/TencentAdapter.ts` — 新增基金代码前缀和解析逻辑
  - `src/server/service/positionService.ts` — 持仓市值计算支持 CNY 原始计价
  - `src/server/service/portfolioService.ts` — 资产汇总支持按 currency 分组
  - `src/server/service/transactionService.ts` — 基金交易的 currency 标记
  - `src/types/asset.ts` — 补充 currency 相关类型（双币字段）
  - `src/shared/constant.ts` — 汇率常量已存在，可复用
  - `src/app/components/add-transaction-dialog.tsx` — 基金交易表单适配
  - `src/app/(pages)/asset/page.tsx` — 币种切换器提升至页面级别
  - `src/app/(pages)/asset/components/asset-dashboard.tsx` — 紧凑四卡片布局，接收 displayCurrency prop
