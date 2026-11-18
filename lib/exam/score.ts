import { getQuestionHandler } from '@/lib/exam/question-types';
import type { AnswerMap, ExamQuestion, GradeResult } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

/**
 * 判分规则（演示）：
 * 单选、判断、填空全对得满分，否则 0 分。
 * 多选必须选项集合完全一致，不给部分分。
 * 填空忽略大小写和首尾空格，标准答案可用 | 分隔多个可接受写法。
 * 积分增量等于本次得分，不是真实激励规则。
 */
export function gradePaper(
  paper: { id: string; title: string; passScore: number; questions: ExamQuestion[] },
  answers: AnswerMap,
): GradeResult {
  const items = paper.questions.map((question) => {
    const record = answers[question.id];
    const handler = getQuestionHandler(question.type);
    const correct = Boolean(
      record &&
        record.payload.type === question.type &&
        question.standard.type === question.type &&
        handler.isCorrect(record.payload, question.standard),
    );
    return {
      questionId: question.id,
      earned: correct ? question.score : 0,
      full: question.score,
      correct,
    };
  });
  const earned = items.reduce((sum, item) => sum + item.earned, 0);
  const total = items.reduce((sum, item) => sum + item.full, 0);
  return {
    paperId: paper.id,
    paperTitle: paper.title,
    earned,
    total,
    passed: earned >= paper.passScore,
    pointsAwarded: earned,
    items,
    dataSource: DEMO_DATA_LABEL,
  };
}
