/**
 * Unified Tool Definitions
 *
 * 每个工具文件导出公共业务逻辑 + 多种引擎适配器（Claude SDK / Hermes），
 * 所有适配器共享同一份核心逻辑，只做格式适配。
 */
export type { HermesToolConfig } from './types';

// Stock tools
export { stockGetPriceClaudeTool, stockGetPriceHermesConfig } from './stockGetPrice';
export { stockRecallMarketInfoClaudeTool, stockMarketInfoHermesConfig } from './stockMarketInfo';
export { stockRecallCompanyInfoClaudeTool, stockCompanyInfoHermesConfig } from './stockCompanyInfo';
export { stockSearchNewsClaudeTool, stockSearchNewsHermesConfig } from './stockSearchNews';

// Note tools
export {
  noteQueryClaudeTool,
  noteQueryHermesConfig,
  noteCreateHermesConfig,
  noteListHermesConfig,
  noteGetHermesConfig,
  noteUpdateHermesConfig,
  noteDeleteHermesConfig,
} from './noteTool';

// Search tools
export { TravilySearchClaudeTool, tavilySearchHermesConfig } from './searchTool';

// Asset tools
export { searchAssetInfoClaudeTool, assetSearchHermesConfig } from './assetTool';

// DB query tools
export { dbQueryClaudeTool, dbQueryHermesConfig } from './dbQueryTool';

// Market info tools
export { marketInfoSaveClaudeTool, marketInfoSaveHermesConfig } from './marketInfoSaveTool';

// Transaction tools
export {
  transactionHistoryClaudeTool,
  transactionHistoryByDateClaudeTool,
  accountBalanceClaudeTool,
  transactionSummaryClaudeTool,
  addTransactionClaudeTool,
  transactionHistoryHermesConfig,
  transactionHistoryByDateHermesConfig,
  accountBalanceHermesConfig,
  transactionSummaryHermesConfig,
  addTransactionHermesConfig,
} from './transactionTool';

// Task tools
export {
  createTaskClaudeTool,
  listTasksClaudeTool,
  updateTaskClaudeTool,
  taskCreateHermesConfig,
  taskListHermesConfig,
  taskUpdateHermesConfig,
} from './taskTool';

// Portfolio tools
export { portfolioQueryHermesConfig } from './portfolioTool';

// Asset meta tools
export { assetMetaCreateHermesConfig, assetMetaUpdateHermesConfig } from './assetMetaTool';

// Asset market info tools
export {
  assetMarketInfoListHermesConfig,
  assetMarketInfoLatestHermesConfig,
  assetMarketInfoDetailHermesConfig,
  assetMarketInfoUpdateHermesConfig,
  assetMarketInfoDeleteHermesConfig,
} from './assetMarketInfoTool';

// Report tools
export { reportListHermesConfig, reportDetailHermesConfig } from './reportTool';