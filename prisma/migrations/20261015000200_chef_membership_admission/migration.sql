CREATE TABLE "ChefMembershipPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceRevision" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "adoptedByUid" TEXT NOT NULL,
  "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  "retiredByUid" TEXT
);
CREATE UNIQUE INDEX "ChefMembershipPolicy_sourceRevision_key" ON "ChefMembershipPolicy"("sourceRevision");
CREATE UNIQUE INDEX "ChefMembershipPolicy_version_key" ON "ChefMembershipPolicy"("version");

CREATE TABLE "ChefMembership" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "applicationId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'offered',
  "version" INTEGER NOT NULL DEFAULT 1,
  "offeredByUid" TEXT NOT NULL,
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedName" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "orientationVerifiedAt" TIMESTAMP(3),
  "orientationVerifiedByUid" TEXT,
  "onboardingVerifiedAt" TIMESTAMP(3),
  "onboardingVerifiedByUid" TEXT,
  "admittedAt" TIMESTAMP(3),
  "admittedByUid" TEXT,
  "endedAt" TIMESTAMP(3),
  "memberReason" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChefMembership_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ChefApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChefMembership_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ChefMembership_status_updatedAt_idx" ON "ChefMembership"("status", "updatedAt");
CREATE INDEX "ChefMembership_applicationId_offeredAt_idx" ON "ChefMembership"("applicationId", "offeredAt");
-- Keep signed agreements from earlier admission rounds, but never allow two
-- concurrent offers/accepted agreements/active memberships for one applicant.
CREATE UNIQUE INDEX "ChefMembership_one_open_per_application" ON "ChefMembership"("applicationId") WHERE "status" IN ('offered', 'accepted', 'active');

CREATE TABLE "ChefMembershipEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "membershipId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "memberReason" TEXT NOT NULL DEFAULT '',
  "privateNote" TEXT NOT NULL DEFAULT '',
  "actorUid" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChefMembershipEvent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChefMembershipEvent_membershipId_version_key" ON "ChefMembershipEvent"("membershipId", "version");

ALTER TABLE "ChefMembershipPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChefMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChefMembershipEvent" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  target REGCLASS;
  browser_role RECORD;
BEGIN
  FOREACH target IN ARRAY ARRAY['"ChefMembershipPolicy"'::REGCLASS, '"ChefMembership"'::REGCLASS, '"ChefMembershipEvent"'::REGCLASS]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c,
        LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
      WHERE c.oid = target AND a.grantee = 0
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', target);
    END IF;
    FOR browser_role IN
      SELECT DISTINCT r.rolname FROM pg_class c,
        LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
        JOIN pg_roles r ON r.oid = a.grantee
      WHERE c.oid = target AND r.rolname IN ('anon', 'authenticated')
    LOOP
      EXECUTE format('REVOKE ALL ON TABLE %s FROM %I', target, browser_role.rolname);
    END LOOP;
  END LOOP;
END $$;
