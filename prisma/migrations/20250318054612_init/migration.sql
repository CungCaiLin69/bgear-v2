-- AlterTable
ALTER TABLE "Repairman" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "phoneNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneNumber" TEXT;
