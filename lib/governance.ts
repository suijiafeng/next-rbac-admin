/**
 * 治理相关的纯函数（无副作用、无 prisma 依赖）。
 * 既被服务端路由使用，也被客户端组件直接引用，因此这里不能引入任何服务端模块。
 */

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: '超级管理员',
  ADMIN: '管理员',
  USER: '普通用户',
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

export interface Risk {
  level: 'high' | 'medium';
  text: string;
}

/** 角色变更的风险评估（建议性提示，不阻断） */
export function evalRoleChangeRisks(input: { fromRole: string; toRole: string }): Risk[] {
  const risks: Risk[] = [];
  if (input.fromRole === 'USER' && input.toRole === 'ADMIN') {
    risks.push({ level: 'medium', text: '普通用户提升为管理员，将获得用户与角色管理能力' });
  }
  if (input.toRole === 'SUPER_ADMIN') {
    risks.push({ level: 'high', text: '提升为超级管理员，将拥有包括删除在内的全部权限' });
  }
  return risks;
}

/** 临时授权的风险评估 */
export function evalTempGrantRisks(input: { grantedRole: string; hours: number }): Risk[] {
  const risks: Risk[] = [];
  if (input.grantedRole === 'ADMIN') {
    risks.push({ level: 'medium', text: '临时提升为管理员，到期将由系统自动回收' });
  }
  if (input.hours > 8) {
    risks.push({ level: 'medium', text: '临时授权时长超过 8 小时，建议缩短' });
  }
  return risks;
}

/** 解析存储在 ChangeRequest.risks 里的 JSON 字符串 */
export function parseRisks(raw?: string | null): Risk[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Risk[]) : [];
  } catch {
    return [];
  }
}
