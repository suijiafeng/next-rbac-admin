export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}
export const rolePageMap = {
  [Role.SUPER_ADMIN]: ['*'],
  [Role.ADMIN]: [
    '/dashboard',
    '/monitoring',
    '/users',
    '/profile',
    '/feedback',
    '/approvals',
    '/temp-grants',
  ],
  [Role.USER]: [
    '/dashboard',
    '/monitoring',
    '/profile',
    '/feedback',
  ],
  // 注：超级管理员为顶层，无需提交反馈，故 rolePageMap 中其使用 '*' 通配
  // 但 page-registry 的 /feedback 守卫限定为 [ADMIN, USER]，超管访问该页将看到 403
};

export const PERMISSIONS = {
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',

  ROLE_VIEW: 'role:view',
  ROLE_CREATE: 'role:create',
  ROLE_EDIT: 'role:edit',
  ROLE_DELETE: 'role:delete',

  // —— 权限治理（变更审批 / 临时授权）——
  CHANGE_VIEW: 'change:view',     // 查看变更请求（无审批权者仅看自己发起的）
  CHANGE_SUBMIT: 'change:submit', // 发起变更请求
  CHANGE_APPROVE: 'change:approve', // 审批（通过/驳回）—— 特权闸门

  TEMP_VIEW: 'temp:view',
  TEMP_GRANT: 'temp:grant',       // 授予临时权限
  TEMP_REVOKE: 'temp:revoke',     // 立即回收 —— 特权闸门
} as const;

export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 各角色拥有的权限列表（单一数据源，lib/permission.ts 和 lib/permission-map.ts 均引用此处） */
export const ROLE_PERMISSION_MAP: Record<Role, PermissionValue[]> = {
  [Role.USER]: [
    PERMISSIONS.USER_VIEW,
  ],
  [Role.ADMIN]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.ROLE_VIEW,
    // 治理：管理员能发起变更、能授予临时权限，但不能自己审批/强制回收
    PERMISSIONS.CHANGE_VIEW,
    PERMISSIONS.CHANGE_SUBMIT,
    PERMISSIONS.TEMP_VIEW,
    PERMISSIONS.TEMP_GRANT,
  ],
  [Role.SUPER_ADMIN]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_EDIT,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.ROLE_VIEW,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_EDIT,
    PERMISSIONS.ROLE_DELETE,
    // 治理：超管拥有审批与强制回收的特权
    PERMISSIONS.CHANGE_VIEW,
    PERMISSIONS.CHANGE_SUBMIT,
    PERMISSIONS.CHANGE_APPROVE,
    PERMISSIONS.TEMP_VIEW,
    PERMISSIONS.TEMP_GRANT,
    PERMISSIONS.TEMP_REVOKE,
  ],
};
