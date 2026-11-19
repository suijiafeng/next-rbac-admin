import { PERMISSIONS, Role, type PermissionValue } from '@/constants/permission';
import type { ExamAction, ExamActor, PaperStatus } from '@/lib/exam/types';

/**
 * 学员 / 出题人 / 审核人 不是新的账号体系，而是现有三角色在考试模块里的身份：
 * USER 学员，ADMIN 出题人，SUPER_ADMIN 审核人。
 * 按钮是否出现，由「身份 × 试卷状态 × 是不是本人的卷」决定。
 * 权限码只负责接口能不能进；进了之后仍要过这张表。
 */
const ACTIONS_BY_ACTOR: Record<ExamActor, Partial<Record<PaperStatus, ExamAction[]>>> = {
  learner: {
    APPROVED: ['take'],
  },
  author: {
    DRAFT: ['edit', 'submitReview'],
    PENDING: ['withdraw'],
    REJECTED: ['edit', 'submitReview'],
    APPROVED: [],
  },
  reviewer: {
    PENDING: ['approve', 'reject'],
  },
};

const PERMISSION_BY_ACTION: Record<ExamAction, PermissionValue> = {
  take: PERMISSIONS.EXAM_TAKE,
  edit: PERMISSIONS.EXAM_AUTHOR,
  submitReview: PERMISSIONS.EXAM_AUTHOR,
  withdraw: PERMISSIONS.EXAM_AUTHOR,
  approve: PERMISSIONS.EXAM_REVIEW,
  reject: PERMISSIONS.EXAM_REVIEW,
};

export function resolveExamActor(role: string | null | undefined): ExamActor | null {
  if (role === Role.USER) return 'learner';
  if (role === Role.ADMIN) return 'author';
  if (role === Role.SUPER_ADMIN) return 'reviewer';
  return null;
}

export function permissionForAction(action: ExamAction): PermissionValue {
  return PERMISSION_BY_ACTION[action];
}

export function visibleActions(
  actor: ExamActor,
  status: PaperStatus,
  isOwner: boolean,
): ExamAction[] {
  const actions = ACTIONS_BY_ACTOR[actor][status] ?? [];
  if (actor === 'author' && !isOwner) return [];
  return [...actions];
}

export function canPerform(
  actor: ExamActor,
  status: PaperStatus,
  action: ExamAction,
  isOwner: boolean,
): boolean {
  return visibleActions(actor, status, isOwner).includes(action);
}

export function nextPaperStatus(action: ExamAction, status: PaperStatus): PaperStatus | null {
  if (action === 'submitReview' && (status === 'DRAFT' || status === 'REJECTED')) return 'PENDING';
  if (action === 'withdraw' && status === 'PENDING') return 'DRAFT';
  if (action === 'approve' && status === 'PENDING') return 'APPROVED';
  if (action === 'reject' && status === 'PENDING') return 'REJECTED';
  return null;
}
