-- CreateEnum
CREATE TYPE "ComposerMode" AS ENUM ('NORMAL', 'MARKDOWN', 'WYSIWYG');

-- AlterTable: per-member delivery timestamp for read-receipt ticks
ALTER TABLE "ConversationMember" ADD COLUMN "lastDeliveredAt" TIMESTAMP(3);

-- AlterTable: per-user chat composer preference
ALTER TABLE "UserSettings" ADD COLUMN "composerMode" "ComposerMode" NOT NULL DEFAULT 'NORMAL';
