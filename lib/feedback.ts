/**
 * 意见反馈的角色层级规则。
 *
 * 数据自底层向上层流动：一条反馈只对「严格高于」提交者角色的人可见，
 * 同级之间互不可见。
 *
 *   USER(1)  ->  ADMIN(2)  ->  SUPER_ADMIN(3)
 *
 * - USER 提交的反馈：ADMIN、SUPER_ADMIN 可见
 * - ADMIN 提交的反馈：仅 SUPER_ADMIN 可见
 * - SUPER_ADMIN 不能提交（已在顶层），但可见所有反馈
 */

export type AppRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

const ROLE_LEVEL: Record<AppRole, number> = {
  USER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function roleLevel(role: string): number {
  return ROLE_LEVEL[role as AppRole] ?? 0;
}

/** 是否可以提交反馈（顶层角色不能提交） */
export function canSubmitFeedback(role: string): boolean {
  const lvl = roleLevel(role);
  return lvl >= 1 && lvl < ROLE_LEVEL.SUPER_ADMIN;
}

/** 是否可以接收反馈（高于最底层即可接收） */
export function canReceiveFeedback(role: string): boolean {
  return roleLevel(role) > ROLE_LEVEL.USER;
}

/** 当前查看者能看到哪些「提交者角色」的反馈 */
export function visibleSubmitterRoles(viewerRole: string): AppRole[] {
  const viewerLevel = roleLevel(viewerRole);
  return (Object.keys(ROLE_LEVEL) as AppRole[]).filter(
    (r) => ROLE_LEVEL[r] < viewerLevel,
  );
}
