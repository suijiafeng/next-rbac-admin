import { PERMISSIONS, type PermissionValue } from '@/constants/permission';
import type { ExamActor } from '@/lib/exam/types';
import { resolveExamActor } from '@/lib/exam/permissions';
import { requireAdminUser } from '@/lib/permission';

export async function requireExamActor() {
  const user = await requireAdminUser();
  const actor = resolveExamActor(user.role);
  if (!actor) {
    throw new Error('无权限');
  }
  return { user, actor };
}

export function permissionForActor(actor: ExamActor): PermissionValue {
  if (actor === 'learner') return PERMISSIONS.EXAM_TAKE;
  if (actor === 'author') return PERMISSIONS.EXAM_AUTHOR;
  return PERMISSIONS.EXAM_REVIEW;
}
