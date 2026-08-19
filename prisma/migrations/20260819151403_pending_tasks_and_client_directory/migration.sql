-- CreateEnum
CREATE TYPE "PendingTaskSection" AS ENUM ('PROYECTOS', 'GESTION_INTERNA');

-- CreateEnum
CREATE TYPE "PendingTaskImportance" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "PendingTaskStatus" AS ENUM ('PENDIENTE', 'EN_CURSO', 'CERRADO');

-- CreateTable
CREATE TABLE "pending_tasks" (
    "id" TEXT NOT NULL,
    "section" "PendingTaskSection" NOT NULL,
    "group_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "task" TEXT NOT NULL,
    "contact_name" TEXT,
    "importance" "PendingTaskImportance",
    "responsible_user_id" TEXT,
    "responsible_name" TEXT,
    "status" "PendingTaskStatus" NOT NULL DEFAULT 'PENDIENTE',
    "raised_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_directory_contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "project_or_site" TEXT,
    "service_in_charge" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_directory_contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pending_tasks" ADD CONSTRAINT "pending_tasks_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_tasks" ADD CONSTRAINT "pending_tasks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
