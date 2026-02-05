import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock decorators before importing the controller
vi.mock('@server/base/decorators', () => ({
  WithRequestContext: () => (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (this: any, ...args: any[]) {
      console.log('Decorator wrapper called for:', _propertyKey);
      const result = await originalMethod.apply(this, args);
      console.log('Decorator wrapper result:', result);
      return result;
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
}));

import { AccountBizController } from '../account';

describe('AccountBizController-Debug', () => {
  let controller: AccountBizController;

  beforeEach(() => {
    controller = new AccountBizController();
    vi.clearAllMocks();
  });

  it('debug test error method', async () => {
    const result = controller.error('test error', 'test_code');
    console.log('error() result:', result);
    expect(result).toBeDefined();
  });

  it('debug test success method', async () => {
    const result = controller.success({ test: 'data' });
    console.log('success() result:', result);
    expect(result).toBeDefined();
  });
});
