-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_repairmanId_fkey";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "repairmanId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_repairmanId_fkey" FOREIGN KEY ("repairmanId") REFERENCES "Repairman"("id") ON DELETE SET NULL ON UPDATE CASCADE;
