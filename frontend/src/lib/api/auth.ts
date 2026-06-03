/** 用户认证 API */
import request from '../request';

/**
 * 用户信息（映射后端 UserResponse schema）
 */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  position: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  position?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/** 登录 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await request.post<TokenResponse>('/api/auth/login', data);
  return res.data;
}

/** 注册 */
export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await request.post<TokenResponse>('/api/auth/register', data);
  return res.data;
}

/** 登出 */
export async function logout(refreshToken: string): Promise<void> {
  await request.post('/api/auth/logout', { refresh_token: refreshToken });
}

/** 刷新令牌 */
export async function refreshToken(token: string): Promise<TokenResponse> {
  const res = await request.post<TokenResponse>('/api/auth/token/refresh', {
    refresh_token: token,
  });
  return res.data;
}

/** 获取当前用户信息 */
export async function getProfile(): Promise<User> {
  const res = await request.get<User>('/api/auth/profile');
  return res.data;
}

/** 更新个人资料 */
export async function updateProfile(data: UserUpdateRequest): Promise<User> {
  const res = await request.put<User>('/api/auth/profile', data);
  return res.data;
}

/** 修改密码 */
export async function changePassword(data: ChangePasswordRequest): Promise<void> {
  await request.put('/api/auth/profile/password', data);
}

/** 获取用户列表 */
export async function getUsers(): Promise<User[]> {
  const res = await request.get<User[]>('/api/users');
  return res.data;
}
