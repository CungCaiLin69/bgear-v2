/*
  Warnings:

  - The primary key for the `Repairman` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_repairmanId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "repairmanId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Repairman" DROP CONSTRAINT "Repairman_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Repairman_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Repairman_id_seq";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_repairmanId_fkey" FOREIGN KEY ("repairmanId") REFERENCES "Repairman"("id") ON DELETE SET NULL ON UPDATE CASCADE;
