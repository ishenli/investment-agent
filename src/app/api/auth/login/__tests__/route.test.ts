import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AuthController before importing the route
const mockLogin = vi.fn();
vi.mock('@/server/controller/authController', () => ({
  AuthController: vi.fn().mockImplementation(() => ({
    login: mockLogin,
  })),
}));

// Mock decorator
vi.mock('@/server/base/decorators', () => ({
  WithRequestContextStatic: vi.fn(() => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor),
}));

// Import the route after mocks are set up - changed from esm-style import to dynamic import workaround
let POST: any;

describe('Auth Login API Route', () => {
  beforeAll(async () => {
    const route = await import('../route');
    POST = route.POST;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回 token 和用户信息', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '登录成功',
        },
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
      expect(json).toEqual({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '登录成功',
        },
      });
    });

    it('应该处理无效的用户名或密码', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: '用户名或密码错误',
        code: 'invalid_credentials',
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'wronguser', password: 'wrongpass' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.message).toBe('用户名或密码错误');
    });

    it('应该处理空用户名', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: '用户名不能为空',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: '', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });

    it('应该处理空密码', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: '密码不能为空',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: '' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });

    it('应该处理无效的 JSON 请求体', async () => {
      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe('登录失败');
    });

    it('应该处理服务层错误', async () => {
      mockLogin.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe('login_error');
    });

    it('应该处理验证错误', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: '验证失败',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'ab', password: 'short' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
    });

    it('应该正确解析包含特殊字符的用户名', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'test_user_123' },
          token: 'mock-jwt-token',
          message: '登录成功',
        },
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'test_user_123', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockLogin).toHaveBeenCalledWith('test_user_123', 'password123');
      expect(json.success).toBe(true);
    });

    it('应该处理空请求体', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        message: '用户名不能为空',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });

    it('应该处理缺少 Content-Type 的请求', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '登录成功',
        },
      });

      const request = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(true);
    });
  });
});