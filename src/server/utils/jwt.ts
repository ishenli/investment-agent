import jwt from 'jsonwebtoken';

// JWT 密钥配置
const JWT_SECRET = process.env.JWT_SECRET || 'investment-agent-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d'; // Token 过期时间

/**
 * JWT payload 类型（签发时使用，不包含 exp 和 iat）
 */
export interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * JWT decoded payload 类型（验证后使用，包含 exp 和 iat）
 */
export interface DecodedJwtPayload extends JwtPayload {
  exp: number;
  iat: number;
}

/**
 * 生成 JWT token
 * @param payload 要包含在 token 中的数据
 * @returns 生成的 token
 */
export function signJwtToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * 验证 JWT token
 * @param token JWT token
 * @returns 解析后的 payload 或 null（如果无效）
 */
export function verifyJwtToken(token: string): DecodedJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // 验证返回的对象是否包含必需的字段
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'userId' in decoded &&
      'username' in decoded &&
      'exp' in decoded &&
      'iat' in decoded
    ) {
      return {
        userId: decoded.userId as string,
        username: decoded.username as string,
        exp: decoded.exp as number,
        iat: decoded.iat as number,
      };
    }
    return null;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}