-- CreateEnum
CREATE TYPE "PresenceStatus" AS ENUM ('AVAILABLE', 'BUSY', 'DND', 'BRB', 'AWAY', 'OFFLINE');

-- AlterEnum
ALTER TYPE "ConversationType" ADD VALUE 'CHANNEL';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "lastReplyAt" TIMESTAMP(3),
ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isGeneral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "ConversationMember" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualUnread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPresence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PresenceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "customText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPresence_userId_key" ON "UserPresence"("userId");

-- CreateIndex
CREATE INDEX "Conversation_teamId_idx" ON "Conversation"("teamId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPresence" ADD CONSTRAINT "UserPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
