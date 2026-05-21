-- AlterTable
ALTER TABLE "Region" ADD COLUMN "admin1Key" TEXT,
ADD COLUMN "geonamesId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Region_geonamesId_key" ON "Region"("geonamesId");

-- CreateIndex
CREATE INDEX "Region_admin1Key_idx" ON "Region"("admin1Key");
