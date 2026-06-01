-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('ALL', 'CUSTOM');

-- CreateTable
CREATE TABLE "AdminRoleRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissionType" "PermissionType" NOT NULL DEFAULT 'CUSTOM',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "cacheRev" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminRoleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminRoleRecord_name_key" ON "AdminRoleRecord"("name");

-- CreateTable
CREATE TABLE "UserRoleRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissionType" "PermissionType" NOT NULL DEFAULT 'CUSTOM',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "cacheRev" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleRecord_name_key" ON "UserRoleRecord"("name");

-- AlterTable: Admin.roleRecordId
ALTER TABLE "Admin" ADD COLUMN "roleRecordId" TEXT;
CREATE INDEX "Admin_roleRecordId_idx" ON "Admin"("roleRecordId");
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_roleRecordId_fkey" FOREIGN KEY ("roleRecordId") REFERENCES "AdminRoleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: AdminInvite.roleRecordId
ALTER TABLE "AdminInvite" ADD COLUMN "roleRecordId" TEXT;
CREATE INDEX "AdminInvite_roleRecordId_idx" ON "AdminInvite"("roleRecordId");
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_roleRecordId_fkey" FOREIGN KEY ("roleRecordId") REFERENCES "AdminRoleRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: User.roleRecordId
ALTER TABLE "User" ADD COLUMN "roleRecordId" TEXT;
CREATE INDEX "User_roleRecordId_idx" ON "User"("roleRecordId");
ALTER TABLE "User" ADD CONSTRAINT "User_roleRecordId_fkey" FOREIGN KEY ("roleRecordId") REFERENCES "UserRoleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed system roles with stable IDs (idempotent: ON CONFLICT DO NOTHING).
-- Subsequent boots reconcile through RbacSeedService; this initial seed is
-- only to make the FK backfill work in the same migration.
INSERT INTO "AdminRoleRecord" ("id", "name", "description", "permissionType", "permissions", "isSystem", "updatedAt")
VALUES
  ('role_sys_admin',  'Administrator', 'Full access - grants every permission.',                  'ALL',    ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP),
  ('role_sys_member', 'Member',        'Read-only baseline access. Extend via custom roles.',     'CUSTOM',
   ARRAY['users.view','meetings.view','teams.view','groups.view','analytics.view']::TEXT[],
   true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "UserRoleRecord" ("id", "name", "description", "permissionType", "permissions", "isSystem", "updatedAt")
VALUES
  ('urole_sys_member', 'Member', 'Default user role: can host meetings, create teams/groups, chat normally.', 'CUSTOM',
   ARRAY[
     'meetings.create','meetings.schedule','meetings.host',
     'teams.create','teams.update','teams.delete','teams.manage-members',
     'teams.channels.create','teams.channels.update','teams.channels.delete',
     'groups.create','groups.update','groups.delete','groups.manage-members',
     'chat.send','chat.react','chat.upload','chat.polls.create',
     'presence.change-status'
   ]::TEXT[],
   true, CURRENT_TIMESTAMP),
  ('urole_sys_restricted', 'Restricted', 'No capabilities - for chat-disabled / banned users.', 'CUSTOM',
   ARRAY[]::TEXT[], true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Backfill: SUPERADMIN → Administrator, ADMIN → Member.
UPDATE "Admin"       SET "roleRecordId" = 'role_sys_admin'  WHERE "role" = 'SUPERADMIN' AND "roleRecordId" IS NULL;
UPDATE "Admin"       SET "roleRecordId" = 'role_sys_member' WHERE "role" = 'ADMIN'      AND "roleRecordId" IS NULL;
UPDATE "AdminInvite" SET "roleRecordId" = 'role_sys_admin'  WHERE "role" = 'SUPERADMIN' AND "roleRecordId" IS NULL;
UPDATE "AdminInvite" SET "roleRecordId" = 'role_sys_member' WHERE "role" = 'ADMIN'      AND "roleRecordId" IS NULL;

-- Backfill: every existing user gets the Member user role.
UPDATE "User" SET "roleRecordId" = 'urole_sys_member' WHERE "roleRecordId" IS NULL;
