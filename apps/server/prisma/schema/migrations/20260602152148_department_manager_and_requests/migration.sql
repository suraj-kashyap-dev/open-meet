/*
  Warnings:

  - You are about to drop the column `decidedByAdminId` on the `ChatAccessRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatAccessRequest" DROP CONSTRAINT "ChatAccessRequest_decidedByAdminId_fkey";

-- AlterTable
ALTER TABLE "ChatAccessRequest" DROP COLUMN "decidedByAdminId",
ADD COLUMN     "decidedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "managerUserId" TEXT;

-- CreateTable
CREATE TABLE "DepartmentJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "ChatAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentJoinRequest_departmentId_status_idx" ON "DepartmentJoinRequest"("departmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentJoinRequest_userId_departmentId_key" ON "DepartmentJoinRequest"("userId", "departmentId");

-- CreateIndex
CREATE INDEX "Department_managerUserId_idx" ON "Department"("managerUserId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAccessRequest" ADD CONSTRAINT "ChatAccessRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentJoinRequest" ADD CONSTRAINT "DepartmentJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentJoinRequest" ADD CONSTRAINT "DepartmentJoinRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentJoinRequest" ADD CONSTRAINT "DepartmentJoinRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
