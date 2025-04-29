/*
  Warnings:

  - You are about to drop the column `location` on the `Order` table. All the data in the column will be lost.
  - Added the required column `complaint` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLat` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `destinationLng` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationLat` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `locationLng` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "location",
ADD COLUMN     "complaint" TEXT NOT NULL,
ADD COLUMN     "destinationLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "destinationLng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locationLat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "locationLng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "vehicleType" TEXT NOT NULL;
