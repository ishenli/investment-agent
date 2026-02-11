import { z } from 'zod';

// JWT Token 相关类型
export interface JwtPayload {
  userId: string;
  username: string;
}

export interface DecodedJwtPayload extends JwtPayload {
  exp: number;
  iat: number;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
}

// 用户类型
export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// 注册/登录请求类型
export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    token: string;
  };
}

export interface AuthCheckResponse {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

// Zod 验证 Schema
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少 3 个字符')
    .max(30, '用户名最多 30 个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z
    .string()
    .min(6, '密码至少需要 6 个字符'),
});

export const LoginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;