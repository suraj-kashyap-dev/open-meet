-- Cross-department chat is approved by a department's RESPONSIBLE ADMIN again
-- (not a regular-user manager). Revert the manager/join-request model.

-- Drop the department join-request workflow entirely.
DROP TABLE "DepartmentJoinRequest";

-- Department: manager (User) -> responsible admin (Admin).
ALTER TABLE "Department" DROP CONSTRAINT "Department_managerUserId_fkey";
DROP INDEX "Department_managerUserId_idx";
ALTER TABLE "Department" DROP COLUMN "managerUserId";
ALTER TABLE "Department" ADD COLUMN "responsibleAdminId" TEXT;
CREATE INDEX "Department_responsibleAdminId_idx" ON "Department"("responsibleAdminId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_responsibleAdminId_fkey" FOREIGN KEY ("responsibleAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ChatAccessRequest: decider User -> Admin.
ALTER TABLE "ChatAccessRequest" DROP CONSTRAINT "ChatAccessRequest_decidedByUserId_fkey";
ALTER TABLE "ChatAccessRequest" DROP COLUMN "decidedByUserId";
ALTER TABLE "ChatAccessRequest" ADD COLUMN "decidedByAdminId" TEXT;
ALTER TABLE "ChatAccessRequest" ADD CONSTRAINT "ChatAccessRequest_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
