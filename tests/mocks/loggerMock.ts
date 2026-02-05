import { vi } from 'vitest';

/**
 * 创建 logger mock
 * @returns logger mock 对象
 */
export function createLoggerMock() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * 为 @server/base/logger 模块创建 mock
 */
export function mockLogger() {
  return {
    default: createLoggerMock(),
  };
}