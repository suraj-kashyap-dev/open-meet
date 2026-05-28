-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "accentColorOverride" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "accentColor" TEXT NOT NULL DEFAULT 'indigo',
ADD COLUMN     "userCanCreateGroups" BOOLEAN NOT NULL DEFAULT false;
