/*
  Warnings:

  - You are about to drop the column `hasRepairman` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Shop` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Repairman" ADD COLUMN     "profilePicture" TEXT,
ADD COLUMN     "servicesProvided" TEXT[],
ALTER COLUMN "currentLocation" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "hasRepairman",
DROP COLUMN "location";
