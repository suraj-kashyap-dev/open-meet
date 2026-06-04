-- CreateEnum
CREATE TYPE "ChatAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "ChatAccessRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "status" "ChatAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decidedByAdminId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatAccessRequest_targetUserId_status_idx" ON "ChatAccessRequest"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "ChatAccessRequest_status_idx" ON "ChatAccessRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ChatAccessRequest_requesterId_targetUserId_key" ON "ChatAccessRequest"("requesterId", "targetUserId");

-- AddForeignKey
ALTER TABLE "ChatAccessRequest" ADD CONSTRAINT "ChatAccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAccessRequest" ADD CONSTRAINT "ChatAccessRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAccessRequest" ADD CONSTRAINT "ChatAccessRequest_decidedByAdminId_fkey" FOREIGN KEY ("decidedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
