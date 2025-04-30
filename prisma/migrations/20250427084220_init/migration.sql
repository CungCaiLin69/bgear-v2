/*
  Warnings:

  - You are about to drop the column `destinationLat` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `destinationLng` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "destinationLat",
DROP COLUMN "destinationLng";
