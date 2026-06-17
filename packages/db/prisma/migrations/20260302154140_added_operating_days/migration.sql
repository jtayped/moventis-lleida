-- AlterTable
ALTER TABLE "Route" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Stop" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "OperatingDay" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT NOT NULL,

    CONSTRAINT "OperatingDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperatingDay_routeId_date_key" ON "OperatingDay"("routeId", "date");

-- AddForeignKey
ALTER TABLE "OperatingDay" ADD CONSTRAINT "OperatingDay_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
