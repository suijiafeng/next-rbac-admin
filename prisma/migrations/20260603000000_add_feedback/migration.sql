-- CreateTable
CREATE TABLE "feedbacks" (
    "id" SERIAL NOT NULL,
    "submitterId" INTEGER NOT NULL,
    "submitterUsername" TEXT NOT NULL,
    "submitterNickname" TEXT,
    "submitterRole" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contact" TEXT,
    "satisfaction" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_reads" (
    "id" SERIAL NOT NULL,
    "feedbackId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedbacks_submitterRole_idx" ON "feedbacks"("submitterRole");

-- CreateIndex
CREATE INDEX "feedbacks_createdAt_idx" ON "feedbacks"("createdAt");

-- CreateIndex
CREATE INDEX "feedback_reads_userId_idx" ON "feedback_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_reads_feedbackId_userId_key" ON "feedback_reads"("feedbackId", "userId");

-- AddForeignKey
ALTER TABLE "feedback_reads" ADD CONSTRAINT "feedback_reads_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
