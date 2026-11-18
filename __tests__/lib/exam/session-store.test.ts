import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_POINTS_LEDGER } from '@/lib/exam/demo-points';
import { gradePaper } from '@/lib/exam/score';
import { DEMO_PAPERS } from '@/lib/exam/demo-data';
import { presentPaper } from '@/lib/exam/present';
import {
  initialExamSessionState,
  selectAnswers,
  selectGrade,
  selectPointsView,
  useExamSessionStore,
} from '@/lib/exam/session-store';
import type { AnswerPayload } from '@/lib/exam/types';

const paper = presentPaper(DEMO_PAPERS[0], 'learner', 'user');

beforeEach(() => {
  useExamSessionStore.setState({
    ...initialExamSessionState,
    ledger: DEMO_POINTS_LEDGER,
  });
});

describe('考试会话 store', () => {
  it('作答写入 answers，成绩页和积分页各自只读自己的 selector', () => {
    const store = useExamSessionStore.getState();
    store.startPaper(paper, 1_000);
    store.updateAnswer(paper.questions[0], { type: 'single', optionId: 'role' }, 1_100);

    const answers = selectAnswers(useExamSessionStore.getState());
    expect(answers['q-role'].payload).toEqual({ type: 'single', optionId: 'role' });
    expect(selectGrade(useExamSessionStore.getState())).toBeNull();

    const payloads: Record<string, AnswerPayload> = {
      'q-role': { type: 'single', optionId: 'role' },
      'q-actions': { type: 'multiple', optionIds: ['view', 'edit'] },
      'q-approve': { type: 'boolean', value: false },
      'q-author': { type: 'blank', text: 'suijiafeng' },
    };
    paper.questions.forEach((question) => {
      useExamSessionStore.getState().updateAnswer(question, payloads[question.id], 2_000);
    });

    const grade = gradePaper(DEMO_PAPERS[0], selectAnswers(useExamSessionStore.getState()));
    useExamSessionStore.getState().commitGrade(grade, 3_000);

    const gradeView = selectGrade(useExamSessionStore.getState());
    const pointsView = selectPointsView(useExamSessionStore.getState());
    expect(gradeView?.earned).toBe(100);
    expect(pointsView.latestDelta).toBe(100);
    expect(pointsView.balance).toBe(20 + 15 + 100);
    expect(pointsView.ledger[0].title).toBe(paper.title);
    expect(pointsView.dataSource).toBe('演示数据');
    expect(pointsView).not.toHaveProperty('answers');
  });

  it('交卷后不再改作答记录', () => {
    useExamSessionStore.getState().startPaper(paper, 1);
    useExamSessionStore.getState().updateAnswer(paper.questions[3], { type: 'blank', text: 'suijiafeng' }, 2);
    useExamSessionStore.getState().commitGrade(
      gradePaper(DEMO_PAPERS[0], selectAnswers(useExamSessionStore.getState())),
      3,
    );
    useExamSessionStore.getState().updateAnswer(paper.questions[3], { type: 'blank', text: 'changed' }, 4);
    const payload = selectAnswers(useExamSessionStore.getState())['q-author'].payload;
    expect(payload).toEqual({ type: 'blank', text: 'suijiafeng' });
  });
});
