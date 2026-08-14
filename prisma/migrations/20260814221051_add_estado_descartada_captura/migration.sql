-- AlterEnum
ALTER TYPE "CaptureStatus" ADD VALUE 'DESCARTADA';

-- AlterTable
ALTER TABLE "expense_captures" ADD COLUMN     "discarded_at" TIMESTAMP(3),
ADD COLUMN     "discarded_by_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "expense_captures" ADD CONSTRAINT "expense_captures_discarded_by_user_id_fkey" FOREIGN KEY ("discarded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
