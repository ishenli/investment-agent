import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AuthController before importing the route
const mockRegister = vi.fn();
vi.mock('@/server/controller/authController', () => ({
  AuthController: vi.fn().mockImplementation(() => ({
    register: mockRegister,
  })),
}));

// Mock decorator
vi.mock('@/server/base/decorators', () => ({
  WithRequestContextStatic: vi.fn(() => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor),
}));

// Import the route after mocks are set up
let POST: any;

describe('Auth Register API Route', () => {
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

  describe('POST /api/auth/register', () => {
    it('应该成功注册并返回 token 和用户信息', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '注册成功',
        },
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockRegister).toHaveBeenCalledWith('testuser', 'password123');
      expect(json).toEqual({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '注册成功',
        },
      });
    });

    it('应该处理用户名已存在的情况', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '用户名已存在',
        code: 'user_exists',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.message).toBe('用户名已存在');
      expect(json.code).toBe('user_exists');
    });

    it('应该处理用户名长度不足的情况', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '用户名至少 3 个字符',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'ab', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });

    it('应该处理用户名过长的情况', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '用户名最多 30 个字符',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'a'.repeat(31),
          password: 'password123',
        }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
    });

    it('应该处理包含非法字符的用户名', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '用户名只能包含字母、数字和下划线',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'test@user', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
    });

    it('应该处理密码长度不足的情况', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '密码至少需要 6 个字符',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: '12345' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });

    it('应该处理无效的 JSON 请求体', async () => {
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe('注册失败');
    });

    it('应该处理数据库错误', async () => {
      mockRegister.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.code).toBe('register_error');
    });

    it('应该正确处理包含数字和下划线的用户名', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'user_123_abc' },
          token: 'mock-jwt-token',
          message: '注册成功',
        },
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'user_123_abc', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockRegister).toHaveBeenCalledWith('user_123_abc', 'password123');
      expect(json.success).toBe(true);
    });

    it('应该处理纯数字用户名', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: '123456' },
          token: 'mock-jwt-token',
          message: '注册成功',
        },
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: '123456', password: 'password123' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockRegister).toHaveBeenCalledWith('123456', 'password123');
      expect(json.success).toBe(true);
    });

    it('应该处理包含中文的密码', async () => {
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: { id: 'user-123', username: 'testuser' },
          token: 'mock-jwt-token',
          message: '注册成功',
        },
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: '密码123abc' }),
      });

      const response = await POST(request);
      const json = await response.json();

      expect(mockRegister).toHaveBeenCalledWith('testuser', '密码123abc');
      expect(json.success).toBe(true);
    });

    it('应该处理空请求体', async () => {
      mockRegister.mockResolvedValue({
        success: false,
        message: '用户名至少 3 个字符',
        code: 'validation_error',
      });

      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const json = await response.json();

      // Should fail validation
      expect(json.success).toBe(false);
      expect(json.code).toBe('validation_error');
    });
  });
});