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
    '/feedback',
    '/approvals',
    '/temp-grants',
    '/exams',
    '/exam-stats',
    '/exam-points',
  ],
  [Role.USER]: [
    '/dashboard',
    '/profile',
    '/feedback',
    '/exams',
    '/exam-take',
    '/exam-result',
    '/exam-points',
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

  // —— 培训考试（个人演示，suijiafeng）——
  EXAM_TAKE: 'exam:take',         // 学员作答
  EXAM_AUTHOR: 'exam:author',     // 出题人维护试卷、提交发布审批
  EXAM_REVIEW: 'exam:review',     // 审核人通过 / 驳回发布
  EXAM_STATS: 'exam:stats',       // 成绩看板
} as const;

export type PermissionValue =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 各角色拥有的权限列表（单一数据源，lib/permission.ts 和 lib/permission-map.ts 均引用此处） */
export const ROLE_PERMISSION_MAP: Record<Role, PermissionValue[]> = {
  [Role.USER]: [
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.EXAM_TAKE,
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
    // 培训考试：出题人，不能审批自己的试卷
    PERMISSIONS.EXAM_AUTHOR,
    PERMISSIONS.EXAM_STATS,
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
    // 培训考试：审核人。权限码给齐是为了通过「超管拥有全部权限」；
    // 按钮仍按身份矩阵走，超管在考试模块里只做审核，不做出题人动作。
    PERMISSIONS.EXAM_TAKE,
    PERMISSIONS.EXAM_AUTHOR,
    PERMISSIONS.EXAM_REVIEW,
    PERMISSIONS.EXAM_STATS,
  ],
};
