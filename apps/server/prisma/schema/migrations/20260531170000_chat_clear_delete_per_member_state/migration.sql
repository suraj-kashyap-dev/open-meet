ALTER TABLE "ConversationMember"
ADD COLUMN "clearedAt" TIMESTAMP(3),
ADD COLUMN "removedAt" TIMESTAMP(3);

CREATE INDEX "ConversationMember_userId_removedAt_idx"
ON "ConversationMember"("userId", "removedAt");
