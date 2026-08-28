-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "purchase_order_number" TEXT,
    "quote_code" TEXT,
    "solicitant_name" TEXT,
    "description" TEXT NOT NULL,
    "hes_requested" BOOLEAN NOT NULL DEFAULT false,
    "hes_requested_date" TIMESTAMP(3),
    "hes_received" BOOLEAN NOT NULL DEFAULT false,
    "invoice_entered_date" TIMESTAMP(3),
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" TIMESTAMP(3),
    "amount_net" DECIMAL(12,2) NOT NULL,
    "igv_amount" DECIMAL(12,2) NOT NULL,
    "detraction_percent" DECIMAL(5,4) NOT NULL DEFAULT 0.12,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
