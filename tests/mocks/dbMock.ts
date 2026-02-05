import { vi } from 'vitest';

/**
 * 创建 db mock 的工厂函数
 * @param tables 需要包含的 query 表
 * @returns db mock 对象
 */
export function createDbMock(tables: string[] = []) {
  const query: Record<string, any> = {};

  // 初始化 tables
  if (tables.length === 0) {
    tables = ['users', 'accounts', 'accountFunds', 'transactions', 'positions', 'stocks', 'userSelectedAccounts'];
  }

  tables.forEach((table) => {
    query[table] = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      insert: vi.fn(),
    };
  });

  return {
    query,
    select: vi.fn(() => ({ from: vi.fn() })),
    insert: vi.fn(),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
    delete: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(),
  };
}

/**
 * 为 @server/lib/db 模块创建 mock
 * @param tables 需要包含的 query 表
 */
export function mockDb(tables: string[] = []) {
  return {
    db: createDbMock(tables),
  };
}