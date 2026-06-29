-- Add ABAC condition field to temp grants
ALTER TABLE "temp_grants"
ADD COLUMN "condition" TEXT;
