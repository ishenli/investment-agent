import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signJwtToken, verifyJwtToken, JwtPayload, DecodedJwtPayload } from '../jwt';

// Mock the jsonwebtoken module
vi.mock('jsonwebtoken', () => {
  const sign = vi.fn();
  const verify = vi.fn();
  return { sign, verify, default: { sign, verify } };
});

// Import the mocked module
import jwt from 'jsonwebtoken';
const mockJwtSign = jwt.sign as any;
const mockJwtVerify = jwt.verify as any;

describe('JWT Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signJwtToken', () => {
    it('应该生成有效的 JWT token', () => {
      const payload: JwtPayload = {
        userId: 'user-123',
        username: 'testuser',
      };
      const mockToken = 'mock.jwt.token';
      mockJwtSign.mockReturnValue(mockToken);

      const result = signJwtToken(payload);

      expect(mockJwtSign).toHaveBeenCalledWith(payload, expect.any(String), {
        expiresIn: '7d',
      });
      expect(result).toBe(mockToken);
    });

    it('应该使用环境变量中的 JWT_SECRET', () => {
      const payload: JwtPayload = { userId: 'test', username: 'user' };
      mockJwtSign.mockReturnValue('token');

      signJwtToken(payload);

      const secretUsed = mockJwtSign.mock.calls[0][1];
      expect(typeof secretUsed).toBe('string');
      expect(secretUsed.length).toBeGreaterThan(0);
    });
  });

  describe('verifyJwtToken', () => {
    const testPayload: DecodedJwtPayload = {
      userId: 'user-123',
      username: 'testuser',
      exp: Date.now() / 1000 + 7 * 24 * 60 * 60,
      iat: Date.now() / 1000,
    };

    it('应该验证有效的 token', () => {
      mockJwtVerify.mockReturnValue(testPayload);

      const result = verifyJwtToken('valid.token.here');

      expect(result).toEqual(testPayload);
      expect(mockJwtVerify).toHaveBeenCalledWith('valid.token.here', expect.any(String));
    });

    it('应该拒绝无效的 token', () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = verifyJwtToken('invalid.token');

      expect(result).toBeNull();
    });

    it('应该处理过期的 token', () => {
      mockJwtVerify.mockImplementation(() => {
        const error: any = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = verifyJwtToken('expired.token');

      expect(result).toBeNull();
    });

    it('应该处理格式错误的 token', () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const result = verifyJwtToken('not-a-jwt');

      expect(result).toBeNull();
    });

    it('应该返回 null 当解码后的 payload 缺少必需字段', () => {
      mockJwtVerify.mockReturnValue({ userId: 'test' });

      const result = verifyJwtToken('token');

      expect(result).toBeNull();
    });

    it('应该返回 null 当解码后的 payload 是 null', () => {
      mockJwtVerify.mockReturnValue(null);

      const result = verifyJwtToken('token');

      expect(result).toBeNull();
    });

    it('应该返回 null 当解码后的 payload 是基本类型', () => {
      mockJwtVerify.mockReturnValue('string');

      const result = verifyJwtToken('token');

      expect(result).toBeNull();
    });

    it('应该正确处理包含所有必需字段的 payload', () => {
      const completePayload: DecodedJwtPayload = {
        userId: '123',
        username: 'testuser',
        exp: 1234567890,
        iat: 1234560000,
      };
      mockJwtVerify.mockReturnValue(completePayload);

      const result = verifyJwtToken('token');

      expect(result).toEqual(completePayload);
    });

    it('应该正确处理携带额外字段的 payload', () => {
      const payloadWithExtras: DecodedJwtPayload & { customField: string } = {
        userId: '123',
        username: 'testuser',
        exp: 1234567890,
        iat: 1234560000,
        customField: 'extra-value',
      };
      mockJwtVerify.mockReturnValue(payloadWithExtras);

      const result = verifyJwtToken('token');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('123');
      expect(result?.username).toBe('testuser');
    });

    it('应该在验证时使用正确的 secret', () => {
      mockJwtVerify.mockReturnValue(testPayload);
      const token = 'test.token';

      verifyJwtToken(token);

      expect(mockJwtVerify).toHaveBeenCalledWith(token, expect.any(String));
    });
  });

  describe('token 流程集成测试', () => {
    it('应该能够签发和验证完整的 token 流程', () => {
      const payload: JwtPayload = {
        userId: 'user-456',
        username: 'alice',
      };
      const mockDecodedPayload: DecodedJwtPayload = {
        ...payload,
        exp: Date.now() / 1000 + 7 * 24 * 60 * 60,
        iat: Date.now() / 1000,
      };
      const mockToken = 'signed.jwt.token';

      mockJwtSign.mockReturnValue(mockToken);
      mockJwtVerify.mockReturnValue(mockDecodedPayload);

      const token = signJwtToken(payload);
      expect(token).toBe(mockToken);

      const verified = verifyJwtToken(token);
      expect(verified).toEqual(mockDecodedPayload);
      expect(verified?.userId).toBe(payload.userId);
      expect(verified?.username).toBe(payload.username);
    });
  });
});