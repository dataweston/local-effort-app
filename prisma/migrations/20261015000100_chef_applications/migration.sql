CREATE TABLE "ChefApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "supabaseUid" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "serviceArea" TEXT NOT NULL,
  "experience" TEXT NOT NULL,
  "interests" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "contactPreference" TEXT NOT NULL DEFAULT 'email',
  "workProfile" JSONB NOT NULL,
  "publicDraft" JSONB NOT NULL,
  "publicationConsent" BOOLEAN NOT NULL DEFAULT false,
  "publicationConsentAt" TIMESTAMP(3),
  "publicationConsentVersion" TEXT,
  "acknowledgmentVersion" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "applicantReason" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "withdrawnAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChefApplication_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChefApplication_status_check" CHECK ("status" IN ('pending', 'reviewed', 'needs-information', 'withdrawn')),
  CONSTRAINT "ChefApplication_version_check" CHECK ("version" > 0),
  CONSTRAINT "ChefApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChefApplication_userId_key" ON "ChefApplication"("userId");
CREATE UNIQUE INDEX "ChefApplication_supabaseUid_key" ON "ChefApplication"("supabaseUid");
CREATE INDEX "ChefApplication_status_updatedAt_idx" ON "ChefApplication"("status", "updatedAt");

CREATE TABLE "ChefApplicationHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "applicantReason" TEXT NOT NULL DEFAULT '',
  "privateNote" TEXT NOT NULL DEFAULT '',
  "actorUid" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChefApplicationHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChefApplicationHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ChefApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChefApplicationHistory_applicationId_version_key" ON "ChefApplicationHistory"("applicationId", "version");

-- All access is through authenticated server handlers, never browser table APIs.
ALTER TABLE "ChefApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChefApplicationHistory" ENABLE ROW LEVEL SECURITY;
-- Prisma Postgres restricts GRANT/REVOKE. Do not issue a privilege mutation
-- when the newly created tables already have no browser grants. If a hosting
-- platform supplies browser grants by default, revocation must still succeed.
DO $$
DECLARE
  target REGCLASS;
  browser_role RECORD;
BEGIN
  FOREACH target IN ARRAY ARRAY['"ChefApplication"'::REGCLASS, '"ChefApplicationHistory"'::REGCLASS]
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
