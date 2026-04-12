import { prisma } from '@/lib/prisma';

export type AuditAction =
  | 'role.grant_admin'
  | 'role.revoke_admin'
  | 'user.create'
  | 'user.delete'
  | 'user.suspend'
  | 'user.unsuspend'
  | 'user.reset_password'
  | 'user.login'
  | 'user.password_change'
  | 'settings.update';

export interface AuditLogInput {
  actorId: number | null;
  actorUsername: string;
  action: AuditAction;
  targetType: 'user' | 'settings';
  targetId?: string | number | null;
  targetLabel?: string | null;
  detail?: unknown;
}

export async function writeAuditLog(input: AuditLogInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorUsername: input.actorUsername,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId !== undefined && input.targetId !== null ? String(input.targetId) : null,
        targetLabel: input.targetLabel ?? null,
        detail: input.detail !== undefined ? JSON.stringify(input.detail) : null,
      },
    });
  } catch (error) {
    console.error('writeAuditLog failed:', error);
  }
}
