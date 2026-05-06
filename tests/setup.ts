import { vi } from 'vitest';

// Mock the drizzle schema before any tests run
vi.mock('@/drizzle/schema', () => ({
  users: {},
  accounts: {},
  accountFunds: {},
  transactions: {},
  positions: {},
  stocks: {},
  assetMeta: {},
  assetMarketInfo: {},
  assetMarketInfoToAssetMeta: {},
  assetCompanyInfo: {},
  assetPriceHistory: {},
  analysisReports: {},
  revenueMetrics: {},
  notes: {},
  settings: {},
  userSelectedAccounts: {},
  assetPositions: {},
  modelProviders: {},
  providerModels: {},
  scheduledTaskLogs: {},
  portfolioSnapshots: {},
  skills: {},
  exchangeRates: {},
  agent: {},
  // Chat tables
  chatSessionGroups: {},
  chatSessions: {},
  chatTopics: {},
  chatMessages: {},
  chatThreads: {},
  chatFiles: {},
  chatPlugins: {},
  chatTraces: {},
  chatSpans: {},
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({ left: '', right: '' })),
  and: vi.fn((...args) => args),
  sql: vi.fn((...args) => args),
  desc: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
  like: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  count: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  or: vi.fn((...args) => args),
  gt: vi.fn(() => ({})),
  gte: vi.fn(() => ({})),
  lt: vi.fn(() => ({})),
}));

// Mock logger - 导入自共享的 mock 工厂
vi.mock('@server/base/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock WithRequestContext decorator - 让测试环境直接调用原始方法
vi.mock('@server/base/decorators', () => ({
  WithRequestContext: () => (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    // 获取原始方法
    const originalMethod = descriptor.value;

    // 定义新的 descriptor.value，保持 this 和参数传递
    descriptor.value = async function (this: any, ...args: any[]) {
      return await originalMethod.apply(this, args);
    };

    return descriptor;
  },
  WithRequestContextStatic: () => (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      return await originalMethod.apply(this, args);
    };
    return descriptor;
  },
  runWithRequestContext: async (fn: () => Promise<any>) => await fn(),
}));
