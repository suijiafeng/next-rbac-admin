import type { Prisma, PrismaClient } from '@prisma/client';
import { DEMO_ATTEMPTS, DEMO_PAPERS } from '@/lib/exam/demo-data';
import { DEMO_DATA_LABEL } from '@/lib/exam/types';

/**
 * 只在缺行时插入。已经审批过的试卷不会被种子覆盖，重启后状态还在。
 */
export async function seedExamRows(db: PrismaClient) {
  for (const paper of DEMO_PAPERS) {
    const existing = await db.examPaper.findUnique({ where: { id: paper.id } });
    if (existing) continue;
    await db.examPaper.create({
      data: {
        id: paper.id,
        title: paper.title,
        summary: paper.summary,
        status: paper.status,
        authorUsername: paper.authorUsername,
        durationSec: paper.durationSec,
        passScore: paper.passScore,
        questions: paper.questions as unknown as Prisma.InputJsonValue,
        dataSource: DEMO_DATA_LABEL,
      },
    });
  }

  const seeded = await db.examAttempt.count({ where: { seeded: true } });
  if (seeded > 0) return;
  await db.examAttempt.createMany({
    data: DEMO_ATTEMPTS.map((attempt) => ({
      externalKey: attempt.id,
      paperId: attempt.paperId,
      paperTitle: attempt.paperTitle,
      username: 'seed',
      learnerLabel: attempt.learnerLabel,
      department: attempt.department,
      answers: {} as Prisma.InputJsonValue,
      earned: attempt.score,
      total: 100,
      passed: attempt.score >= 60,
      pointsAwarded: attempt.points,
      submittedAt: new Date(attempt.submittedAt),
      dataSource: DEMO_DATA_LABEL,
      seeded: true,
    })),
  });
}
