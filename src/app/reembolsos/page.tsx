import { redirect } from "next/navigation";

// "Reembolsos" se replanteó como "Préstamos de personal" (dinero que el
// equipo adelanta de su bolsillo a la empresa) y ahora vive dentro de
// /prestamos, junto a los préstamos de terceros. Esta ruta se conserva solo
// para no romper enlaces/accesos directos guardados.
export default function ReembolsosRedirectPage() {
  redirect("/prestamos");
}
