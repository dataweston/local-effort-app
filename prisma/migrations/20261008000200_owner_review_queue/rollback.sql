DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OwnerReviewRequest" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "OwnerReviewMember" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "OwnerReviewDecision" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "OwnerReviewAudit" LIMIT 1)
    OR EXISTS (SELECT 1 FROM "OwnerReviewRule" LIMIT 1) THEN
    RAISE EXCEPTION 'Owner review rollback refused: review or rule data exists; preserve records and roll forward instead';
  END IF;
END $$;

DROP TABLE "OwnerReviewAudit";
DROP TABLE "OwnerReviewDecision";
DROP TABLE "OwnerReviewMember";
DROP TABLE "OwnerReviewRequest";
DROP TABLE "OwnerReviewRule";
