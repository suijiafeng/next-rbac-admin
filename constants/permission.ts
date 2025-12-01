export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}
export const rolePageMap = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN]: [
    '/dashboard',
    '/users',
    '/profile',
  ],
  [Role.USER]: [
    '/dashboard',
    '/profile',
  ],
};

export const PERMISSIONS = {
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
} as const;

export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];