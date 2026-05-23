-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "meetingPreferences" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "privacySettings" JSONB NOT NULL DEFAULT '{}';
