-- Historical geography reference tables

CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "historicalName" TEXT,
    "iso2" TEXT,
    "iso3" TEXT,
    "periodFrom" INTEGER,
    "periodTo" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "geonamesId" INTEGER,
    "wikidataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodFrom" INTEGER,
    "periodTo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT,
    "name" TEXT NOT NULL,
    "historicalName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "population" INTEGER,
    "timezone" TEXT,
    "periodFrom" INTEGER,
    "periodTo" INTEGER,
    "geonamesId" INTEGER,
    "wikidataId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalPlaceAlias" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "oldName" TEXT NOT NULL,
    "fromYear" INTEGER,
    "toYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricalPlaceAlias_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Place" ADD COLUMN "geoCountryId" TEXT;
ALTER TABLE "Place" ADD COLUMN "geoRegionId" TEXT;
ALTER TABLE "Place" ADD COLUMN "geoCityId" TEXT;

CREATE UNIQUE INDEX "Country_geonamesId_key" ON "Country"("geonamesId");
CREATE INDEX "Country_periodFrom_periodTo_idx" ON "Country"("periodFrom", "periodTo");
CREATE INDEX "Country_iso2_idx" ON "Country"("iso2");
CREATE INDEX "Country_name_idx" ON "Country"("name");

CREATE INDEX "Region_countryId_idx" ON "Region"("countryId");
CREATE INDEX "Region_periodFrom_periodTo_idx" ON "Region"("periodFrom", "periodTo");
CREATE INDEX "Region_name_idx" ON "Region"("name");

CREATE UNIQUE INDEX "City_geonamesId_key" ON "City"("geonamesId");
CREATE INDEX "City_countryId_idx" ON "City"("countryId");
CREATE INDEX "City_regionId_idx" ON "City"("regionId");
CREATE INDEX "City_periodFrom_periodTo_idx" ON "City"("periodFrom", "periodTo");
CREATE INDEX "City_name_idx" ON "City"("name");

CREATE INDEX "HistoricalPlaceAlias_cityId_idx" ON "HistoricalPlaceAlias"("cityId");
CREATE INDEX "HistoricalPlaceAlias_oldName_idx" ON "HistoricalPlaceAlias"("oldName");

CREATE INDEX "Place_geoCountryId_idx" ON "Place"("geoCountryId");
CREATE INDEX "Place_geoRegionId_idx" ON "Place"("geoRegionId");
CREATE INDEX "Place_geoCityId_idx" ON "Place"("geoCityId");

ALTER TABLE "Region" ADD CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "City" ADD CONSTRAINT "City_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HistoricalPlaceAlias" ADD CONSTRAINT "HistoricalPlaceAlias_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_geoCountryId_fkey" FOREIGN KEY ("geoCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_geoRegionId_fkey" FOREIGN KEY ("geoRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Place" ADD CONSTRAINT "Place_geoCityId_fkey" FOREIGN KEY ("geoCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
