-- Add the OWNER conversation member role in its own migration so later migrations
-- can safely write that enum value on PostgreSQL.

ALTER TYPE "ConversationMemberRole" ADD VALUE 'OWNER' BEFORE 'MEMBER';
