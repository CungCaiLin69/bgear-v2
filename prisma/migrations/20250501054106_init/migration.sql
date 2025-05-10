-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_repairmanId_fkey";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_repairmanId_fkey" FOREIGN KEY ("repairmanId") REFERENCES "Repairman"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
