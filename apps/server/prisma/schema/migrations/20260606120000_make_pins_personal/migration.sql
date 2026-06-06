-- Message pins become personal (per-user). Legacy shared pins with no attributable
-- pinner can no longer exist, so drop them before enforcing NOT NULL.
DELETE FROM "PinnedMessage" WHERE "pinnedById" IS NULL;

-- DropForeignKey
ALTER TABLE "PinnedMessage" DROP CONSTRAINT "PinnedMessage_pinnedById_fkey";

-- DropIndex
DROP INDEX "PinnedMessage_conversationId_idx";

-- DropIndex
DROP INDEX "PinnedMessage_conversationId_messageId_key";

-- AlterTable
ALTER TABLE "PinnedMessage" ALTER COLUMN "pinnedById" SET NOT NULL;

-- CreateIndex
CREATE INDEX "PinnedMessage_conversationId_pinnedById_idx" ON "PinnedMessage"("conversationId", "pinnedById");

-- CreateIndex
CREATE UNIQUE INDEX "PinnedMessage_messageId_pinnedById_key" ON "PinnedMessage"("messageId", "pinnedById");

-- AddForeignKey
ALTER TABLE "PinnedMessage" ADD CONSTRAINT "PinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
