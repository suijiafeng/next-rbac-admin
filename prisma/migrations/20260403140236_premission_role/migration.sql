/*
  Warnings:

  - You are about to drop the `SystemSetting` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "SystemSetting";

-- CreateTable
CREATE TABLE "system_setting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_setting_key_key" ON "system_setting"("key");
