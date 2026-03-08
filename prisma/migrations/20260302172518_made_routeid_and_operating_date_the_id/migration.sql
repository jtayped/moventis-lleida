/*
  Warnings:

  - The primary key for the `OperatingDay` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `OperatingDay` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."OperatingDay_routeId_date_key";

-- AlterTable
ALTER TABLE "OperatingDay" DROP CONSTRAINT "OperatingDay_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "OperatingDay_pkey" PRIMARY KEY ("routeId", "date");
