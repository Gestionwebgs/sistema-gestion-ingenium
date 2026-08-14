-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('PENDIENTE', 'CLASIFICADO');

-- CreateTable
CREATE TABLE "expense_captures" (
    "id" TEXT NOT NULL,
    "captured_by_user_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_type" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ocr_raw_text" TEXT,
    "ocr_extracted_date" TIMESTAMP(3),
    "ocr_extracted_amount" DECIMAL(12,2),
    "ocr_extracted_vendor" TEXT,
    "ocr_extracted_document_number" TEXT,
    "status" "CaptureStatus" NOT NULL DEFAULT 'PENDIENTE',
    "expense_id" TEXT,
    "classified_at" TIMESTAMP(3),

    CONSTRAINT "expense_captures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_captures_expense_id_key" ON "expense_captures"("expense_id");

-- AddForeignKey
ALTER TABLE "expense_captures" ADD CONSTRAINT "expense_captures_captured_by_user_id_fkey" FOREIGN KEY ("captured_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_captures" ADD CONSTRAINT "expense_captures_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
