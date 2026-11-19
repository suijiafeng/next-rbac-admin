import type { AnswerPayload, QuestionRef, QuestionType } from '@/lib/exam/types';

/**
 * 一种题型一份约定：空答案、归一化、交卷校验、判分。
 * 新增题型时在这里登记，并在 components/exam/question-registry.tsx 挂上子组件。
 * updateAnswer 只按 type 取这份约定，本身不用改。
 */
export interface QuestionTypeHandler {
  type: QuestionType;
  empty: () => AnswerPayload;
  normalize: (payload: AnswerPayload, question: QuestionRef) => AnswerPayload;
  validate: (payload: AnswerPayload) => string | null;
  isCorrect: (payload: AnswerPayload, standard: AnswerPayload) => boolean;
}

function mismatch(expected: QuestionType): never {
  throw new Error(`答案类型与题目不一致：${expected}`);
}

function optionIds(question: QuestionRef): Set<string> {
  return new Set((question.options ?? []).map((option) => option.id));
}

export const questionTypeHandlers: Record<QuestionType, QuestionTypeHandler> = {
  single: {
    type: 'single',
    empty: () => ({ type: 'single', optionId: null }),
    normalize(payload, question) {
      if (payload.type !== 'single') mismatch('single');
      const allowed = optionIds(question);
      const optionId = payload.optionId && allowed.has(payload.optionId) ? payload.optionId : null;
      return { type: 'single', optionId };
    },
    validate(payload) {
      if (payload.type !== 'single') return '题型不匹配';
      if (!payload.optionId) return '请选择一个选项';
      return null;
    },
    isCorrect(payload, standard) {
      return (
        payload.type === 'single' &&
        standard.type === 'single' &&
        payload.optionId !== null &&
        payload.optionId === standard.optionId
      );
    },
  },
  multiple: {
    type: 'multiple',
    empty: () => ({ type: 'multiple', optionIds: [] }),
    normalize(payload, question) {
      if (payload.type !== 'multiple') mismatch('multiple');
      const allowed = optionIds(question);
      const selected = Array.from(new Set(payload.optionIds.filter((id) => allowed.has(id)))).sort();
      return { type: 'multiple', optionIds: selected };
    },
    validate(payload) {
      if (payload.type !== 'multiple') return '题型不匹配';
      if (payload.optionIds.length === 0) return '请至少选择一个选项';
      return null;
    },
    isCorrect(payload, standard) {
      if (payload.type !== 'multiple' || standard.type !== 'multiple') return false;
      const left = [...payload.optionIds].sort();
      const right = [...standard.optionIds].sort();
      if (left.length !== right.length) return false;
      return left.every((id, index) => id === right[index]);
    },
  },
  boolean: {
    type: 'boolean',
    empty: () => ({ type: 'boolean', value: null }),
    normalize(payload) {
      if (payload.type !== 'boolean') mismatch('boolean');
      const value = payload.value === true ? true : payload.value === false ? false : null;
      return { type: 'boolean', value };
    },
    validate(payload) {
      if (payload.type !== 'boolean') return '题型不匹配';
      if (payload.value === null) return '请判断对错';
      return null;
    },
    isCorrect(payload, standard) {
      return (
        payload.type === 'boolean' &&
        standard.type === 'boolean' &&
        payload.value !== null &&
        payload.value === standard.value
      );
    },
  },
  blank: {
    type: 'blank',
    empty: () => ({ type: 'blank', text: '' }),
    normalize(payload) {
      if (payload.type !== 'blank') mismatch('blank');
      return { type: 'blank', text: payload.text.trim().slice(0, 200) };
    },
    validate(payload) {
      if (payload.type !== 'blank') return '题型不匹配';
      if (!payload.text.trim()) return '请填写答案';
      return null;
    },
    isCorrect(payload, standard) {
      if (payload.type !== 'blank' || standard.type !== 'blank') return false;
      const accepted = standard.text
        .split('|')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
      const given = payload.text.trim().toLowerCase();
      return given.length > 0 && accepted.includes(given);
    },
  },
};

export function getQuestionHandler(type: QuestionType): QuestionTypeHandler {
  const handler = questionTypeHandlers[type];
  if (!handler) {
    throw new Error(`未注册的题型：${type}`);
  }
  return handler;
}
