// Script puntual: crea una ficha de Lender (prestamista) por cada nombre
// distinto que ya existe en Loan.lenderName, y les asigna el lenderId
// correspondiente a todos sus préstamos existentes. Se corre UNA vez,
// después de aplicar la migración que agrega el modelo Lender y la columna
// lender_id (nullable) en loans — no borra ni modifica ningún otro dato.
// Uso: npx tsx prisma/backfill-lenders.ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const loansWithoutLender = await prisma.loan.findMany({
    where: { lenderId: null },
    select: { id: true, lenderName: true },
  });

  if (loansWithoutLender.length === 0) {
    console.log("No hay préstamos sin prestamista asignado. Nada que hacer.");
    return;
  }

  const namesToLoanIds = new Map<string, string[]>();
  for (const loan of loansWithoutLender) {
    const name = loan.lenderName.trim();
    if (!namesToLoanIds.has(name)) namesToLoanIds.set(name, []);
    namesToLoanIds.get(name)!.push(loan.id);
  }

  for (const [name, loanIds] of namesToLoanIds) {
    const lender = await prisma.lender.create({ data: { name } });
    await prisma.loan.updateMany({
      where: { id: { in: loanIds } },
      data: { lenderId: lender.id },
    });
    console.log(
      `Prestamista "${name}" creado (${loanIds.length} préstamo${loanIds.length === 1 ? "" : "s"} asignado${loanIds.length === 1 ? "" : "s"}).`
    );
  }

  console.log(`Listo. ${namesToLoanIds.size} prestamista(s) creado(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
