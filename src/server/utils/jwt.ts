import { JwtPayload } from '../service/authService';

/**
 * 验证JWT token（模拟实现）
 * @param token JWT token
 * @returns 解析后的payload或null（如果无效）
 */
export function verifyJwtToken(token: string): JwtPayload | null {
  // 在实际应用中，这里应该使用jwt库来验证token
  // 例如：return jwt.verify(token, process.env.JWT_SECRET);

  // 临时实现：假设token是简单的用户ID（仅用于开发环境）
  try {
    return { userId: '1' };
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}

/**
 * 生成JWT token（模拟实现）
 * @param payload 要包含在token中的数据
 * @returns 生成的token
 */
export function signJwtToken(payload: object): string {
  // 在实际应用中，这里应该使用jwt库来生成token
  // 例如：return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 临时实现：直接返回用户ID（仅用于开发环境）
  if ('userId' in payload && typeof payload.userId === 'string') {
    return payload.userId;
  }

  return '1'; // 默认用户ID
}
