import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AnswerMap, DemoAttemptRecord, ExamPaper, GradeResult, PaperStatus } from '@/lib/exam/types';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

type PaperRow = {
  id: string;
  title: string;
  summary: string;
  status: string;
  authorUsername: string;
  durationSec: number;
  passScore: number;
  questions: unknown;
  dataSource: string;
};

type AttemptRow = {
  id: number;
  externalKey: string | null;
  paperId: string;
  paperTitle: string;
  username: string;
  learnerLabel: string;
  department: string;
  answers: unknown;
  earned: number;
  total: number;
  passed: boolean;
  pointsAwarded: number;
  submittedAt: Date;
  dataSource: string;
  seeded: boolean;
};

function toPaper(row: PaperRow): ExamPaper {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status as PaperStatus,
    authorUsername: row.authorUsername,
    durationSec: row.durationSec,
    passScore: row.passScore,
    questions: row.questions as ExamPaper['questions'],
    dataSource: DEMO_DATA_LABEL,
  };
}

function toAttempt(row: AttemptRow): DemoAttemptRecord {
  return {
    id: row.externalKey || String(row.id),
    paperId: row.paperId,
    paperTitle: row.paperTitle,
    department: row.department,
    learnerLabel: row.learnerLabel,
    score: row.earned,
    points: row.pointsAwarded,
    submittedAt: row.submittedAt.toISOString(),
    dataSource: DEMO_DATA_LABEL,
  };
}

export async function listExamPapers(): Promise<ExamPaper[]> {
  const rows = await prisma.examPaper.findMany({ orderBy: { id: 'asc' } });
  return rows.map((row) => toPaper(row));
}

export async function getExamPaper(id: string): Promise<ExamPaper | null> {
  const row = await prisma.examPaper.findUnique({ where: { id } });
  return row ? toPaper(row) : null;
}

export async function updateExamPaperStatus(id: string, status: PaperStatus): Promise<ExamPaper | null> {
  try {
    const row = await prisma.examPaper.update({ where: { id }, data: { status } });
    return toPaper(row);
  } catch {
    return null;
  }
}

/** 看板只聚合库里的作答记录，调用方仍应标明演示数据。 */
export async function listExamAttempts(): Promise<DemoAttemptRecord[]> {
  const rows = await prisma.examAttempt.findMany({ orderBy: { submittedAt: 'asc' } });
  return rows.map((row) => toAttempt(row));
}

export async function saveExamAttempt(input: {
  paper: ExamPaper;
  username: string;
  answers: AnswerMap;
  grade: GradeResult;
  submittedAt?: Date;
}): Promise<void> {
  const submittedAt = input.submittedAt ?? new Date();
  await prisma.examAttempt.create({
    data: {
      externalKey: `live-${input.username}-${input.paper.id}-${submittedAt.getTime()}`,
      paperId: input.paper.id,
      paperTitle: input.paper.title,
      username: input.username,
      learnerLabel: input.username,
      department: '演示部门甲',
      answers: input.answers as unknown as Prisma.InputJsonValue,
      earned: input.grade.earned,
      total: input.grade.total,
      passed: input.grade.passed,
      pointsAwarded: input.grade.pointsAwarded,
      submittedAt,
      dataSource: DEMO_DATA_LABEL,
      seeded: false,
    },
  });
}
