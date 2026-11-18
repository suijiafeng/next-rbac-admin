-- 培训考试与货品演示表。数字均为演示数据。

CREATE TABLE "exam_papers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "authorUsername" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT '演示数据',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_papers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_attempts" (
    "id" SERIAL NOT NULL,
    "externalKey" TEXT,
    "paperId" TEXT NOT NULL,
    "paperTitle" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "learnerLabel" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "earned" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "dataSource" TEXT NOT NULL DEFAULT '演示数据',
    "seeded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "goods_items" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "shelfChannel" TEXT,
    "shelfTitle" TEXT,
    "shelfPriceCents" INTEGER,
    "authorUsername" TEXT NOT NULL,
    "reviewerUsername" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT '演示数据',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exam_attempts_externalKey_key" ON "exam_attempts"("externalKey");
CREATE INDEX "exam_papers_status_idx" ON "exam_papers"("status");
CREATE INDEX "exam_attempts_paperId_idx" ON "exam_attempts"("paperId");
CREATE INDEX "exam_attempts_submittedAt_idx" ON "exam_attempts"("submittedAt");
CREATE INDEX "exam_attempts_department_idx" ON "exam_attempts"("department");
CREATE UNIQUE INDEX "goods_items_sku_key" ON "goods_items"("sku");
CREATE INDEX "goods_items_reviewStatus_idx" ON "goods_items"("reviewStatus");

ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
