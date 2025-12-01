import type { PermissionValue } from '@/constants/permission';

export interface AuthUser {
  id: number;
  username: string;
  nickname: string | null;
  email?: string | null;
  role: string;
}

export interface AuthInfo {
  user: AuthUser | null;
  role: string | null;
  permissions: PermissionValue[];
}

export interface ProfileResponse {
  code: number;
  data: AuthInfo | null;
  message: string;
}