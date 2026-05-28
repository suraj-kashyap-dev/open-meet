-- An attachment belongs to exactly one owner: a meeting message OR a chat
-- message (never both). Prisma can't express this XOR, so enforce it in SQL as
-- defense-in-depth behind the repository claim() logic.
ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_single_owner_chk"
  CHECK (NOT ("messageId" IS NOT NULL AND "chatMessageId" IS NOT NULL));
