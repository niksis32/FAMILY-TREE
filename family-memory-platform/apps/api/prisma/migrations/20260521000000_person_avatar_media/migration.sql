-- AlterTable
ALTER TABLE "Person" ADD COLUMN "avatarMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_avatarMediaId_key" ON "Person"("avatarMediaId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
