/**
 * 测试 Mock 工具函数入口
 *
 * 使用示例：
 * ```typescript
 * // 在测试文件中使用
 * vi.mock('@server/lib/db', () => mockDb(['users', 'accounts']));
 *
 * // 或使用默认所有表
 * vi.mock('@server/lib/db', () => mockDb());
 *
 * // 控制器测试中 mock 装饰器
 * import { mockDecorators } from '@/tests/mocks';
 * vi.mock('@server/base/decorators', () => mockDecorators());
 * ```
 */

export { createDbMock, mockDb } from './dbMock';
export { createLoggerMock, mockLogger } from './loggerMock';
export { mockDecorators } from './decoratorMock';