import { describe, it, expect } from 'vitest';
import {
  roleLevel,
  canSubmitFeedback,
  canReceiveFeedback,
  visibleSubmitterRoles,
} from '@/lib/feedback';

describe('roleLevel', () => {
  it('USER 等级为 1', () => expect(roleLevel('USER')).toBe(1));
  it('ADMIN 等级为 2', () => expect(roleLevel('ADMIN')).toBe(2));
  it('SUPER_ADMIN 等级为 3', () => expect(roleLevel('SUPER_ADMIN')).toBe(3));
  it('未知角色等级为 0', () => expect(roleLevel('UNKNOWN')).toBe(0));
});

describe('canSubmitFeedback', () => {
  it('USER 可以提交', () => expect(canSubmitFeedback('USER')).toBe(true));
  it('ADMIN 可以提交', () => expect(canSubmitFeedback('ADMIN')).toBe(true));
  it('SUPER_ADMIN 不能提交（顶层）', () => expect(canSubmitFeedback('SUPER_ADMIN')).toBe(false));
  it('未知角色不能提交', () => expect(canSubmitFeedback('UNKNOWN')).toBe(false));
});

describe('canReceiveFeedback', () => {
  it('ADMIN 可以接收', () => expect(canReceiveFeedback('ADMIN')).toBe(true));
  it('SUPER_ADMIN 可以接收', () => expect(canReceiveFeedback('SUPER_ADMIN')).toBe(true));
  it('USER 不能接收（最低层）', () => expect(canReceiveFeedback('USER')).toBe(false));
  it('未知角色不能接收', () => expect(canReceiveFeedback('UNKNOWN')).toBe(false));
});

describe('visibleSubmitterRoles', () => {
  it('SUPER_ADMIN 可见 USER 和 ADMIN 提交的反馈', () => {
    const roles = visibleSubmitterRoles('SUPER_ADMIN');
    expect(roles).toContain('USER');
    expect(roles).toContain('ADMIN');
    expect(roles).not.toContain('SUPER_ADMIN');
  });

  it('ADMIN 只能看到 USER 提交的反馈', () => {
    const roles = visibleSubmitterRoles('ADMIN');
    expect(roles).toEqual(['USER']);
  });

  it('USER 看不到任何反馈（无下级）', () => {
    const roles = visibleSubmitterRoles('USER');
    expect(roles).toEqual([]);
  });

  it('未知角色看不到任何反馈', () => {
    const roles = visibleSubmitterRoles('UNKNOWN');
    expect(roles).toEqual([]);
  });
});
