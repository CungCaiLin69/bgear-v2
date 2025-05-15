/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `vehicleType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "updatedAt",
ADD COLUMN     "note" TEXT,
ADD COLUMN     "vehicleBrand" TEXT,
ADD COLUMN     "vehicleMileage" INTEGER,
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "vehicleType" TEXT NOT NULL,
ADD COLUMN     "vehicleYear" INTEGER;
