/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `Repairman` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Repairman_phoneNumber_key" ON "Repairman"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_phoneNumber_key" ON "Shop"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
