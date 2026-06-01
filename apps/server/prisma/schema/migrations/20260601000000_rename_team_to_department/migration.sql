-- Rename Team -> Department and TeamMember -> DepartmentMember (tables, columns,
-- constraints, and indexes) so the schema matches the new naming with no drift.

-- Tables
ALTER TABLE "Team" RENAME TO "Department";
ALTER TABLE "TeamMember" RENAME TO "DepartmentMember";

-- Column
ALTER TABLE "DepartmentMember" RENAME COLUMN "teamId" TO "departmentId";

-- Primary keys
ALTER TABLE "Department" RENAME CONSTRAINT "Team_pkey" TO "Department_pkey";
ALTER TABLE "DepartmentMember" RENAME CONSTRAINT "TeamMember_pkey" TO "DepartmentMember_pkey";

-- Foreign keys
ALTER TABLE "Department" RENAME CONSTRAINT "Team_responsibleAdminId_fkey" TO "Department_responsibleAdminId_fkey";
ALTER TABLE "DepartmentMember" RENAME CONSTRAINT "TeamMember_teamId_fkey" TO "DepartmentMember_departmentId_fkey";
ALTER TABLE "DepartmentMember" RENAME CONSTRAINT "TeamMember_userId_fkey" TO "DepartmentMember_userId_fkey";

-- Indexes
ALTER INDEX "Team_responsibleAdminId_idx" RENAME TO "Department_responsibleAdminId_idx";
ALTER INDEX "TeamMember_userId_idx" RENAME TO "DepartmentMember_userId_idx";
ALTER INDEX "TeamMember_teamId_userId_key" RENAME TO "DepartmentMember_departmentId_userId_key";

-- Migrate stored admin-role permission keys: teams.* -> departments.*
UPDATE "AdminRoleRecord"
SET "permissions" = ARRAY(
  SELECT CASE
    WHEN p LIKE 'teams.%' THEN 'departments.' || substring(p FROM 7)
    ELSE p
  END
  FROM unnest("permissions") AS p
);
