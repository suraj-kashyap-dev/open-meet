-- CreateEnum
CREATE TYPE "MeetingDefaultView" AS ENUM ('GALLERY', 'SPEAKER');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'PARTICIPANTS_ONLY', 'PRIVATE');

-- AlterTable
-- The legacy `avatar` column stored a free-form URL; we now store a storage key
-- under `avatarKey` and derive the URL via the storage provider. Old URL values
-- are not valid keys, so we drop the column outright instead of renaming.
ALTER TABLE "User"
    DROP COLUMN "avatar",
    DROP COLUMN "meetingPreferences",
    DROP COLUMN "privacySettings",
    ADD COLUMN  "avatarKey" TEXT;

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultMicMuted" BOOLEAN NOT NULL DEFAULT false,
    "defaultCameraOff" BOOLEAN NOT NULL DEFAULT false,
    "defaultView" "MeetingDefaultView" NOT NULL DEFAULT 'GALLERY',
    "enableJoinSound" BOOLEAN NOT NULL DEFAULT true,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "showEmailToParticipants" BOOLEAN NOT NULL DEFAULT true,
    "allowDirectMessages" BOOLEAN NOT NULL DEFAULT true,
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PARTICIPANTS_ONLY',
    "shareUsageData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
