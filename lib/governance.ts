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

/* ============================================================
 * ABAC 约束（属性条件）—— 让授权可以附带"上下文条件"
 * v1 支持「仅工作时间」时间窗；纯函数，服务端鉴权与客户端展示共用。
 * ========================================================== */

export interface BusinessHoursCondition {
  type: 'business_hours';
  startHour: number; // 含
  endHour: number; // 不含
}

export type AccessCondition = BusinessHoursCondition;

export const BUSINESS_HOURS: BusinessHoursCondition = {
  type: 'business_hours',
  startHour: 9,
  endHour: 21,
};

export function parseCondition(raw?: string | null): AccessCondition | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === 'business_hours') {
      return {
        type: 'business_hours',
        startHour: Number(parsed.startHour),
        endHour: Number(parsed.endHour),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 当前是否满足约束。无约束 / 解析失败 → 视为满足（fail-open，避免误伤可用性）。
 * 注意：使用服务运行环境的本地时间（Vercel 上为 UTC）。
 */
export function isConditionSatisfiedNow(raw?: string | null, now: Date = new Date()): boolean {
  const cond = parseCondition(raw);
  if (!cond) return true;
  if (cond.type === 'business_hours') {
    const hour = now.getHours();
    return hour >= cond.startHour && hour < cond.endHour;
  }
  return true;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function conditionLabel(raw?: string | null): string {
  const cond = parseCondition(raw);
  if (!cond) return '无约束';
  if (cond.type === 'business_hours') {
    return `仅工作时间 ${pad2(cond.startHour)}:00–${pad2(cond.endHour)}:00`;
  }
  return '自定义约束';
}
