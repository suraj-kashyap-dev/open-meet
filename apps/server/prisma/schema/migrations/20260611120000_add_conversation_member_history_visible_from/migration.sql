-- AlterTable: per-member lower bound for visible chat history (Teams-style "share old chat" on add)
ALTER TABLE "ConversationMember" ADD COLUMN "historyVisibleFrom" TIMESTAMP(3);
