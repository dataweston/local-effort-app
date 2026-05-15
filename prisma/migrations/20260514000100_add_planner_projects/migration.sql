-- AlterTable: add project tracking fields to PlannerCard
ALTER TABLE "PlannerCard" ADD COLUMN "assigneeId" TEXT;
ALTER TABLE "PlannerCard" ADD COLUMN "dueDate" TEXT;
ALTER TABLE "PlannerCard" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PlannerCard" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PlannerCard" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'todo';

-- CreateTable
CREATE TABLE "PlannerProject" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "spaceKey" TEXT,
    "targetDate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerProject_supabaseUid_idx" ON "PlannerProject"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerProject_supabaseUid_slug_key" ON "PlannerProject"("supabaseUid", "slug");

-- CreateIndex
CREATE INDEX "PlannerCard_supabaseUid_projectId_idx" ON "PlannerCard"("supabaseUid", "projectId");
