-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "durationMin" INTEGER,
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Recording" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "MeetingInvite" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultMeetingTitle" TEXT NOT NULL DEFAULT 'Untitled meeting',
    "allowGuestJoin" BOOLEAN NOT NULL DEFAULT true,
    "maxMeetingMinutes" INTEGER,
    "banner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingInvite_meetingId_idx" ON "MeetingInvite"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingInvite_meetingId_email_key" ON "MeetingInvite"("meetingId", "email");

-- CreateIndex
CREATE INDEX "Meeting_scheduledFor_idx" ON "Meeting"("scheduledFor");

-- AddForeignKey
ALTER TABLE "MeetingInvite" ADD CONSTRAINT "MeetingInvite_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
