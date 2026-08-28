-- CreateEnum
CREATE TYPE "QuoteStage" AS ENUM ('ENVIADA', 'EN_EVALUACION', 'OC_RECIBIDA', 'PAGADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "code" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "amount_no_igv" DECIMAL(12,2) NOT NULL,
    "igv_amount" DECIMAL(12,2) NOT NULL,
    "stage" "QuoteStage" NOT NULL DEFAULT 'ENVIADA',
    "quote_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
