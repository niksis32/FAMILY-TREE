-- CreateEnum
CREATE TYPE "GeoEntityType" AS ENUM ('COUNTRY', 'REGION', 'CITY');

-- CreateTable
CREATE TABLE "GeographicName" (
    "id" TEXT NOT NULL,
    "entityType" "GeoEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographicName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeographicName_entityType_entityId_locale_key" ON "GeographicName"("entityType", "entityId", "locale");

-- CreateIndex
CREATE INDEX "GeographicName_entityType_entityId_idx" ON "GeographicName"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "GeographicName_locale_name_idx" ON "GeographicName"("locale", "name");

-- CreateIndex
CREATE INDEX "GeographicName_entityType_locale_name_idx" ON "GeographicName"("entityType", "locale", "name");
