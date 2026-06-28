-- Group provenance, ownership, lifecycle, and audit trail.

CREATE TYPE "ConversationOrigin" AS ENUM (
  'USER_CREATED',
  'ADMIN_CREATED',
  'ADMIN_ON_BEHALF',
  'SYSTEM_MANAGED',
  'IMPORTED',
  'AUTOMATION_CREATED',
  'AI_CREATED'
);

CREATE TYPE "ActorType" AS ENUM (
  'USER',
  'ADMIN',
  'SYSTEM',
  'MIGRATION',
  'AUTOMATION',
  'AI'
);

CREATE TYPE "ConversationLifecycleStatus" AS ENUM (
  'ACTIVE',
  'ARCHIVED',
  'DELETED'
);

ALTER TABLE "Conversation"
  ADD COLUMN "origin" "ConversationOrigin" NOT NULL DEFAULT 'USER_CREATED',
  ADD COLUMN "createdByActorType" "ActorType",
  ADD COLUMN "createdByUserId" TEXT,
  ADD COLUMN "createdByDisplayName" TEXT,
  ADD COLUMN "createdVia" TEXT,
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "status" "ConversationLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedByActorType" "ActorType",
  ADD COLUMN "archivedByActorId" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedByActorType" "ActorType",
  ADD COLUMN "deletedByActorId" TEXT;

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Conversation_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Conversation_origin_idx" ON "Conversation"("origin");
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "Conversation_ownerUserId_idx" ON "Conversation"("ownerUserId");
CREATE INDEX "Conversation_createdByUserId_idx" ON "Conversation"("createdByUserId");
CREATE INDEX "Conversation_createdByAdminId_idx" ON "Conversation"("createdByAdminId");

CREATE TABLE "GroupAuditEvent" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorType" "ActorType" NOT NULL,
  "actorUserId" TEXT,
  "actorAdminId" TEXT,
  "actorLabel" TEXT,
  "targetUserId" TEXT,
  "metadata" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GroupAuditEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GroupAuditEvent"
  ADD CONSTRAINT "GroupAuditEvent_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "GroupAuditEvent_conversationId_createdAt_idx"
  ON "GroupAuditEvent"("conversationId", "createdAt");
CREATE INDEX "GroupAuditEvent_actorType_createdAt_idx"
  ON "GroupAuditEvent"("actorType", "createdAt");
CREATE INDEX "GroupAuditEvent_action_createdAt_idx"
  ON "GroupAuditEvent"("action", "createdAt");

UPDATE "Conversation" AS c
SET
  "origin" = 'ADMIN_CREATED',
  "createdByActorType" = 'ADMIN',
  "createdVia" = 'ADMIN_PANEL',
  "createdByDisplayName" = a."name"
FROM "Admin" AS a
WHERE c."createdByAdminId" = a."id"
  AND c."type" = 'GROUP';

WITH inferred_owner AS (
  SELECT DISTINCT ON (cm."conversationId")
    cm."conversationId",
    cm."userId",
    u."name"
  FROM "ConversationMember" cm
  JOIN "Conversation" c ON c."id" = cm."conversationId"
  JOIN "User" u ON u."id" = cm."userId"
  WHERE c."type" = 'GROUP'
    AND c."createdByAdminId" IS NULL
    AND cm."role" = 'ADMIN'
  ORDER BY cm."conversationId", cm."joinedAt" ASC
)
UPDATE "Conversation" AS c
SET
  "origin" = 'USER_CREATED',
  "createdByActorType" = 'USER',
  "createdByUserId" = inferred_owner."userId",
  "ownerUserId" = inferred_owner."userId",
  "createdByDisplayName" = inferred_owner."name",
  "createdVia" = 'WEB_CHAT'
FROM inferred_owner
WHERE c."id" = inferred_owner."conversationId";

UPDATE "ConversationMember" cm
SET "role" = 'OWNER'
FROM "Conversation" c
WHERE c."id" = cm."conversationId"
  AND c."type" = 'GROUP'
  AND c."ownerUserId" = cm."userId";
