-- Portal-wide site settings (branding defaults, landing copy, module toggles)

CREATE TABLE "PortalSiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "portalName" TEXT NOT NULL DEFAULT 'Family Memory',
    "tagline" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "secondaryColor" TEXT NOT NULL DEFAULT '#c4a35a',
    "faviconUrl" TEXT,
    "landingCopy" JSONB NOT NULL DEFAULT '{}',
    "modules" JSONB NOT NULL DEFAULT '{}',
    "defaultLocale" TEXT NOT NULL DEFAULT 'ru',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PortalSiteSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PortalSiteSettings" ADD CONSTRAINT "PortalSiteSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "PortalSiteSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
