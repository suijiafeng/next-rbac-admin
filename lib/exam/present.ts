import { visibleActions } from '@/lib/exam/permissions';
import type { ExamActor, ExamPaper, PublicPaper, PublicQuestion } from '@/lib/exam/types';

export function toPublicQuestion(question: ExamPaper['questions'][number]): PublicQuestion {
  return {
    id: question.id,
    type: question.type,
    stem: question.stem,
    score: question.score,
    options: question.options,
  };
}

export function presentPaper(paper: ExamPaper, actor: ExamActor, username: string): PublicPaper {
  const isOwner = paper.authorUsername === username;
  return {
    id: paper.id,
    title: paper.title,
    summary: paper.summary,
    status: paper.status,
    authorUsername: paper.authorUsername,
    durationSec: paper.durationSec,
    passScore: paper.passScore,
    dataSource: paper.dataSource,
    questions: paper.questions.map(toPublicQuestion),
    actions: visibleActions(actor, paper.status, isOwner),
  };
}

export function papersForActor(papers: ExamPaper[], actor: ExamActor, username: string): PublicPaper[] {
  const visible = papers.filter((paper) => {
    if (actor === 'learner') return paper.status === 'APPROVED';
    if (actor === 'author') return paper.authorUsername === username;
    return true;
  });
  return visible.map((paper) => presentPaper(paper, actor, username));
}
