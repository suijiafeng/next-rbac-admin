import { getQuestionHandler } from '@/lib/exam/question-types';
import type { AnswerMap, AnswerPayload, ExamQuestion, QuestionRef } from '@/lib/exam/types';

export interface AnswerValidation {
  ok: boolean;
  errors: Record<string, string>;
}

/**
 * 四种题型唯一的写入入口。
 * 子组件只负责采集载荷，不自己拼 AnswerMap。
 */
export function updateAnswer(
  answers: AnswerMap,
  question: QuestionRef,
  payload: AnswerPayload,
  now: number,
): AnswerMap {
  const handler = getQuestionHandler(question.type);
  const normalized = handler.normalize(payload, question);
  return {
    ...answers,
    [question.id]: {
      questionId: question.id,
      payload: normalized,
      updatedAt: now,
    },
  };
}

export function validateAnswers(questions: QuestionRef[], answers: AnswerMap): AnswerValidation {
  const errors: Record<string, string> = {};
  questions.forEach((question) => {
    const record = answers[question.id];
    const handler = getQuestionHandler(question.type);
    if (!record) {
      errors[question.id] = handler.validate(handler.empty()) ?? '请作答';
      return;
    }
    if (record.payload.type !== question.type) {
      errors[question.id] = '答案类型与题目不一致';
      return;
    }
    const message = handler.validate(record.payload);
    if (message) errors[question.id] = message;
  });
  return { ok: Object.keys(errors).length === 0, errors };
}

export function emptyPayload(question: Pick<ExamQuestion, 'type'>): AnswerPayload {
  return getQuestionHandler(question.type).empty();
}
