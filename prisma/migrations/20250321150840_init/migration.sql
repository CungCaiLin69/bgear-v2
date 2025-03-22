/*
  Warnings:

  - Added the required column `location` to the `Shop` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "location" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "has_shop" BOOLEAN NOT NULL DEFAULT false;
