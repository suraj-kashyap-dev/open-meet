-- Remove the user-side RBAC: drop user roles + the per-user role link, and
-- replace the workspace-wide group-creation toggle with a per-user flag.

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleRecordId_fkey";

-- DropIndex
DROP INDEX "User_roleRecordId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "roleRecordId",
ADD COLUMN     "canCreateGroups" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "WorkspaceSettings" DROP COLUMN "userCanCreateGroups";

-- DropTable
DROP TABLE "UserRoleRecord";
