-- Step 17 - drop the legacy AdminRole enum and the flat tier columns.
-- After this migration the RBAC `roleRecordId` is the sole authority on admin
-- + user tier; Admin/User both require a roleRecordId.

-- Backfill any User rows that somehow escaped Step-2's backfill (defensive).
UPDATE "User" SET "roleRecordId" = 'urole_sys_member' WHERE "roleRecordId" IS NULL;

-- Backfill any Admin rows missing a roleRecordId (defensive). This is unreachable
-- in practice because Step-2's backfill ran inside the same migration that added
-- the column, but it guarantees the NOT NULL alter succeeds.
UPDATE "Admin" SET "roleRecordId" = 'role_sys_member' WHERE "roleRecordId" IS NULL;

-- AlterTable: make the FK required
ALTER TABLE "Admin" ALTER COLUMN "roleRecordId" SET NOT NULL;
ALTER TABLE "User"  ALTER COLUMN "roleRecordId" SET NOT NULL;

-- AlterTable: drop the legacy enum columns
ALTER TABLE "Admin"       DROP COLUMN "role";
ALTER TABLE "AdminInvite" DROP COLUMN "role";

-- DropEnum
DROP TYPE "AdminRole";
