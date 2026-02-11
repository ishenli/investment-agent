import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AuthController before importing the route
const mockCheckAuth = vi.fn();
vi.mock('@/server/controller/authController', () => ({
  AuthController: vi.fn().mockImplementation(() => ({
    checkAuth: mockCheckAuth,
  })),
}));

// Mock decorator
vi.mock('@/server/base/decorators', () => ({
  WithRequestContextStatic: vi.fn(() => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor),
}));

// Import the route after mocks are set up
let GET: any;

describe('Auth Check API Route', () => {
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

  describe('GET /api/auth/check', () => {
    it('应该从 Authorization header 中提取 Bearer token 并验证', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: true,
          user: { id: 'user-123', username: 'testuser' },
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'Bearer valid-jwt-token',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith('valid-jwt-token');
      expect(json).toEqual({
        success: true,
        data: {
          isAuthenticated: true,
          user: { id: 'user-123', username: 'testuser' },
        },
      });
    });

    it('应该从查询参数中提取 token 并验证', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: true,
          user: { id: 'user-456', username: 'anotheruser' },
        },
      });

      const request = new Request('http://localhost/api/auth/check?token=valid-jwt-token');

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith('valid-jwt-token');
      expect(json.success).toBe(true);
    });

    it('当没有 token 时应返回未认证状态', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check');

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith(undefined);
      expect(json).toEqual({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });
    });

    it('应该优先使用 Authorization header 中的 token 而非查询参数', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: true,
          user: { id: 'user-123', username: 'testuser' },
        },
      });

      const request = new Request('http://localhost/api/auth/check?token=query-token', {
        headers: {
          Authorization: 'Bearer header-token',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith('header-token');
      expect(json.success).toBe(true);
    });

    it('应该处理无效的 token', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(json.data.isAuthenticated).toBe(false);
      expect(json.data.user).toBeNull();
    });

    it('应该处理过期的 token', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'Bearer expired-token',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(json.data.isAuthenticated).toBe(false);
    });

    it('应该处理缺少 Bearer 前缀的 Authorization header', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'token-without-bearer',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith(undefined);
    });

    it('应该处理服务层错误并返回未认证状态', async () => {
      mockCheckAuth.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(json).toEqual({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });
    });

    it('应该处理空 Authorization header', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: '',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(mockCheckAuth).toHaveBeenCalledWith(undefined);
      expect(json.data.isAuthenticated).toBe(false);
    });

    it('应该处理空查询参数 token', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check?token=');

      const response = await GET(request);
      const json = await response.json();

      expect(json.data.isAuthenticated).toBe(false);
    });

    it('应该处理 Bearer 后空格的情况', async () => {
      mockCheckAuth.mockResolvedValue({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });

      const request = new Request('http://localhost/api/auth/check', {
        headers: {
          Authorization: 'Bearer ',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      // "Bearer " 会被处理为 undefined 或空字符串
      expect(['', undefined].includes(mockCheckAuth.mock.calls[0][0])).toBe(true);
      expect(json.data.isAuthenticated).toBe(false);
    });
  });
});