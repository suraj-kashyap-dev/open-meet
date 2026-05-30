-- Remove the team-channel feature: drop CHANNEL conversations, @channel mentions,
-- the CHANNEL enum values, and the channel-only Conversation columns.

-- Purge channel data first so the enum recreations below cannot fail on live rows.
DELETE FROM "MessageMention" WHERE "kind" = 'CHANNEL';
DELETE FROM "Conversation" WHERE "type" = 'CHANNEL';

-- AlterEnum
BEGIN;
CREATE TYPE "ConversationType_new" AS ENUM ('DIRECT', 'GROUP');
ALTER TABLE "Conversation" ALTER COLUMN "type" TYPE "ConversationType_new" USING ("type"::text::"ConversationType_new");
ALTER TYPE "ConversationType" RENAME TO "ConversationType_old";
ALTER TYPE "ConversationType_new" RENAME TO "ConversationType";
DROP TYPE "public"."ConversationType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MentionKind_new" AS ENUM ('USER', 'EVERYONE');
ALTER TABLE "public"."MessageMention" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "MessageMention" ALTER COLUMN "kind" TYPE "MentionKind_new" USING ("kind"::text::"MentionKind_new");
ALTER TYPE "MentionKind" RENAME TO "MentionKind_old";
ALTER TYPE "MentionKind_new" RENAME TO "MentionKind";
DROP TYPE "public"."MentionKind_old";
ALTER TABLE "MessageMention" ALTER COLUMN "kind" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_teamId_fkey";

-- DropIndex
DROP INDEX "Conversation_teamId_idx";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "isGeneral",
DROP COLUMN "teamId";
