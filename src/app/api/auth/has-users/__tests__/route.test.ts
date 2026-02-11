import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AuthController before importing the route
const mockHasUsers = vi.fn();
vi.mock('@/server/controller/authController', () => ({
  AuthController: vi.fn().mockImplementation(() => ({
    hasUsers: mockHasUsers,
  })),
}));

// Mock decorator
vi.mock('@/server/base/decorators', () => ({
  WithRequestContextStatic: vi.fn(() => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor),
}));

// Import the route after mocks are set up
let GET: any;

describe('Auth Has-Users API Route', () => {
  beforeAll(async () => {
    const route = await import('../route');
    GET = route.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/auth/has-users', () => {
    it('应该返回 true 当系统中存在用户时', async () => {
      mockHasUsers.mockResolvedValue({
        success: true,
        data: {
          hasUsers: true,
        },
      });

      const request = new Request('http://localhost/api/auth/has-users');

      const response = await GET(request);
      const json = await response.json();

      expect(mockHasUsers).toHaveBeenCalled();
      expect(json).toEqual({
        success: true,
        data: {
          hasUsers: true,
        },
      });
    });

    it('应该返回 false 当系统中没有用户时', async () => {
      mockHasUsers.mockResolvedValue({
        success: true,
        data: {
          hasUsers: false,
        },
      });

      const request = new Request('http://localhost/api/auth/has-users');

      const response = await GET(request);
      const json = await response.json();

      expect(mockHasUsers).toHaveBeenCalled();
      expect(json).toEqual({
        success: true,
        data: {
          hasUsers: false,
        },
      });
    });

    it('应该处理数据库错误并返回 false', async () => {
      mockHasUsers.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new Request('http://localhost/api/auth/has-users');

      const response = await GET(request);
      const json = await response.json();

      expect(json).toEqual({
        success: true,
        data: {
          hasUsers: false,
        },
      });
    });

    it('应该处理服务器端的任何异常并返回 false', async () => {
      mockHasUsers.mockImplementation(() => {
        throw new Error('Unknown error occurred');
      });

      const request = new Request('http://localhost/api/auth/has-users');

      const response = await GET(request);
      const json = await response.json();

      expect(json).toEqual({
        success: true,
        data: {
          hasUsers: false,
        },
      });
    });

    it('应该正确处理成功响应的数据格式', async () => {
      mockHasUsers.mockResolvedValue({
        success: true,
        data: {
          hasUsers: true,
        },
      });

      const request = new Request('http://localhost/api/auth/has-users');

      const response = await GET(request);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect('data' in json).toBe(true);
      expect('hasUsers' in json.data).toBe(true);
      expect(typeof json.data.hasUsers).toBe('boolean');
    });

    it('应该忽略额外的头部', async () => {
      mockHasUsers.mockResolvedValue({
        success: true,
        data: {
          hasUsers: false,
        },
      });

      const request = new Request('http://localhost/api/auth/has-users', {
        headers: { 'X-Custom-Header': 'value' },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(json).toEqual({
        success: true,
        data: {
          hasUsers: false,
        },
      });
    });

    it('应该忽略查询参数', async () => {
      mockHasUsers.mockResolvedValue({
        success: true,
        data: {
          hasUsers: true,
        },
      });

      const request = new Request('http://localhost/api/auth/has-users?test=true&value=123');

      const response = await GET(request);
      const json = await response.json();

      expect(mockHasUsers).toHaveBeenCalledWith();
      expect(json.data.hasUsers).toBe(true);
    });
  });
});