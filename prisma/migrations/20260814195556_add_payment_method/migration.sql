-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'YAPE_PLIN', 'TRANSFERENCIA', 'TARJETA', 'OTRO');

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "payment_method" "PaymentMethod";
