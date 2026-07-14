-- Keep the column nullable so historic planner cards retain their zone-based
-- semantics until an operator explicitly classifies them.
ALTER TABLE "PlannerCard" ADD COLUMN "objectType" TEXT;