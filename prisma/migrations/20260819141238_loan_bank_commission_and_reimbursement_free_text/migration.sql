/*
  Warnings:

  - Added the required column `paid_to_name` to the `reimbursements` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "reimbursements" DROP CONSTRAINT "reimbursements_paid_to_user_id_fkey";

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "bank_commission" DECIMAL(12,2),
ADD COLUMN     "bank_commission_currency" "LoanCurrency";

-- AlterTable
ALTER TABLE "reimbursements" ADD COLUMN     "paid_to_name" TEXT NOT NULL,
ALTER COLUMN "paid_to_user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_paid_to_user_id_fkey" FOREIGN KEY ("paid_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
