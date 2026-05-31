-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "description" TEXT,
ADD COLUMN     "responsibleAdminId" TEXT;

-- CreateIndex
CREATE INDEX "Team_responsibleAdminId_idx" ON "Team"("responsibleAdminId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_responsibleAdminId_fkey" FOREIGN KEY ("responsibleAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
