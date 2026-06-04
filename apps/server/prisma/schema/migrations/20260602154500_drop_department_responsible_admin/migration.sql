-- The department's responsible person is now its manager (a User). Drop the
-- legacy admin "responsible admin" column.

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_responsibleAdminId_fkey";

-- DropIndex
DROP INDEX "Department_responsibleAdminId_idx";

-- AlterTable
ALTER TABLE "Department" DROP COLUMN "responsibleAdminId";
