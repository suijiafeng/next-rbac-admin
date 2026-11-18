import { describe, expect, it } from 'vitest';
import { updateAnswer } from '@/lib/exam/answers';
import { DEMO_PAPERS } from '@/lib/exam/demo-data';
import { gradePaper } from '@/lib/exam/score';
import type { AnswerMap, AnswerPayload } from '@/lib/exam/types';

const paper = DEMO_PAPERS[0];

function answerAll(overrides?: Partial<Record<string, AnswerPayload>>): AnswerMap {
  const defaults: Record<string, AnswerPayload> = {
    'q-role': { type: 'single', optionId: 'role' },
    'q-actions': { type: 'multiple', optionIds: ['view', 'edit'] },
    'q-approve': { type: 'boolean', value: false },
    'q-author': { type: 'blank', text: 'SuiJiaFeng' },
  };
  let answers: AnswerMap = {};
  paper.questions.forEach((question) => {
    answers = updateAnswer(answers, question, overrides?.[question.id] ?? defaults[question.id], 1);
  });
  return answers;
}

describe('判分', () => {
  it('全对得到满分、及格，并按得分记演示积分', () => {
    const grade = gradePaper(paper, answerAll());
    expect(grade.earned).toBe(100);
    expect(grade.total).toBe(100);
    expect(grade.passed).toBe(true);
    expect(grade.pointsAwarded).toBe(100);
    expect(grade.dataSource).toBe('演示数据');
    expect(grade.items.every((item) => item.correct)).toBe(true);
  });

  it('多选漏选不得分，填空大小写不敏感', () => {
    const grade = gradePaper(
      paper,
      answerAll({
        'q-actions': { type: 'multiple', optionIds: ['view'] },
        'q-author': { type: 'blank', text: '  suijiafeng  ' },
      }),
    );
    const multiple = grade.items.find((item) => item.questionId === 'q-actions');
    const blank = grade.items.find((item) => item.questionId === 'q-author');
    expect(multiple).toMatchObject({ earned: 0, correct: false });
    expect(blank).toMatchObject({ earned: 25, correct: true });
    expect(grade.earned).toBe(75);
    expect(grade.passed).toBe(true);
  });

  it('低于及格线时 passed 为 false', () => {
    const grade = gradePaper(
      paper,
      answerAll({
        'q-role': { type: 'single', optionId: 'route' },
        'q-actions': { type: 'multiple', optionIds: ['compile'] },
        'q-approve': { type: 'boolean', value: true },
        'q-author': { type: 'blank', text: 'nobody' },
      }),
    );
    expect(grade.earned).toBe(0);
    expect(grade.passed).toBe(false);
    expect(grade.pointsAwarded).toBe(0);
  });
});
