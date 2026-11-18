import { describe, expect, it } from 'vitest';
import { updateAnswer, validateAnswers } from '@/lib/exam/answers';
import { DEMO_PAPERS } from '@/lib/exam/demo-data';
import type { AnswerMap, AnswerPayload, QuestionRef } from '@/lib/exam/types';

const paper = DEMO_PAPERS[0];
const questions = paper.questions;

function question(id: string): QuestionRef {
  const found = questions.find((item) => item.id === id);
  if (!found) throw new Error(id);
  return found;
}

describe('统一答案结构与 updateAnswer', () => {
  it('四种题型都通过同一个 updateAnswer 写入 AnswerRecord', () => {
    let answers: AnswerMap = {};
    const payloads: AnswerPayload[] = [
      { type: 'single', optionId: 'role' },
      { type: 'multiple', optionIds: ['view', 'edit'] },
      { type: 'boolean', value: false },
      { type: 'blank', text: ' suijiafeng ' },
    ];
    questions.forEach((item, index) => {
      answers = updateAnswer(answers, item, payloads[index], 1_700_000_000_000 + index);
    });
    expect(Object.keys(answers)).toEqual(questions.map((item) => item.id));
    expect(answers['q-role'].payload).toEqual({ type: 'single', optionId: 'role' });
    expect(answers['q-actions'].payload).toEqual({ type: 'multiple', optionIds: ['edit', 'view'] });
    expect(answers['q-approve'].payload).toEqual({ type: 'boolean', value: false });
    expect(answers['q-author'].payload).toEqual({ type: 'blank', text: 'suijiafeng' });
    expect(answers['q-author'].updatedAt).toBe(1_700_000_000_003);
  });

  it('单选丢掉不存在的选项，多选去重并排序', () => {
    const single = updateAnswer({}, question('q-role'), { type: 'single', optionId: 'nope' }, 1);
    expect(single['q-role'].payload).toEqual({ type: 'single', optionId: null });

    const multiple = updateAnswer(
      {},
      question('q-actions'),
      { type: 'multiple', optionIds: ['edit', 'edit', 'missing', 'view'] },
      2,
    );
    expect(multiple['q-actions'].payload).toEqual({ type: 'multiple', optionIds: ['edit', 'view'] });
  });

  it('载荷类型和题目不一致时拒绝写入', () => {
    expect(() => updateAnswer({}, question('q-role'), { type: 'blank', text: 'x' }, 1)).toThrow(/不一致/);
  });

  it('交卷校验指出未作答的题', () => {
    const result = validateAnswers(questions, {});
    expect(result.ok).toBe(false);
    expect(result.errors['q-role']).toBe('请选择一个选项');
    expect(result.errors['q-approve']).toBe('请判断对错');
    expect(result.errors['q-author']).toBe('请填写答案');
  });
});
