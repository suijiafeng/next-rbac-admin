import { describe, expect, it } from 'vitest';
import { PERMISSIONS, Role } from '@/constants/permission';
import {
  canPerform,
  permissionForAction,
  resolveExamActor,
  visibleActions,
} from '@/lib/exam/permissions';
import type { ExamAction, ExamActor, PaperStatus } from '@/lib/exam/types';

describe('考试身份', () => {
  it('沿用现有三角色', () => {
    expect(resolveExamActor(Role.USER)).toBe('learner');
    expect(resolveExamActor(Role.ADMIN)).toBe('author');
    expect(resolveExamActor(Role.SUPER_ADMIN)).toBe('reviewer');
    expect(resolveExamActor('GUEST')).toBeNull();
  });
});

describe('审批状态 × 角色 的操作矩阵', () => {
  const cases: Array<[ExamActor, PaperStatus, boolean, ExamAction[]]> = [
    ['learner', 'APPROVED', false, ['take']],
    ['learner', 'PENDING', false, []],
    ['learner', 'DRAFT', false, []],
    ['author', 'DRAFT', true, ['edit', 'submitReview']],
    ['author', 'REJECTED', true, ['edit', 'submitReview']],
    ['author', 'PENDING', true, ['withdraw']],
    ['author', 'APPROVED', true, []],
    ['author', 'DRAFT', false, []],
    ['reviewer', 'PENDING', false, ['approve', 'reject']],
    ['reviewer', 'APPROVED', false, []],
    ['reviewer', 'DRAFT', true, []],
    ['reviewer', 'REJECTED', false, []],
  ];

  it.each(cases)('%s 在 %s（本人=%s）看到 %j', (actor, status, isOwner, actions) => {
    expect(visibleActions(actor, status, isOwner)).toEqual(actions);
    actions.forEach((action) => {
      expect(canPerform(actor, status, action, isOwner)).toBe(true);
    });
  });

  it('通过和驳回走审核权限，提交走出题权限，作答走学员权限', () => {
    expect(permissionForAction('approve')).toBe(PERMISSIONS.EXAM_REVIEW);
    expect(permissionForAction('reject')).toBe(PERMISSIONS.EXAM_REVIEW);
    expect(permissionForAction('submitReview')).toBe(PERMISSIONS.EXAM_AUTHOR);
    expect(permissionForAction('take')).toBe(PERMISSIONS.EXAM_TAKE);
  });
});
