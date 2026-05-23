-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('RECORDING', 'STOPPING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Recording"
    ADD COLUMN "egressId"    TEXT,
    ADD COLUMN "status"      "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    ADD COLUMN "startedById" TEXT,
    ADD COLUMN "storageKey"  TEXT,
    ADD COLUMN "mime"        TEXT NOT NULL DEFAULT 'video/mp4',
    ADD COLUMN "error"       TEXT,
    ADD COLUMN "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "endedAt"     TIMESTAMP(3),
    ADD COLUMN "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "url" DROP NOT NULL,
    ALTER COLUMN "duration" SET DEFAULT 0,
    ALTER COLUMN "size" SET DEFAULT 0;

-- Backfill non-null fields then enforce.
UPDATE "Recording" SET "egressId" = "id" WHERE "egressId" IS NULL;
UPDATE "Recording" SET "startedById" = (SELECT "hostId" FROM "Meeting" WHERE "Meeting"."id" = "Recording"."meetingId")
  WHERE "startedById" IS NULL;

ALTER TABLE "Recording"
    ALTER COLUMN "egressId" SET NOT NULL,
    ALTER COLUMN "startedById" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Recording_egressId_key" ON "Recording"("egressId");
CREATE INDEX "Recording_status_idx" ON "Recording"("status");
