// Estado de una factura/valorización, calculado siempre a partir de estos 3
// campos (nunca guardado aparte, para que no se pueda desincronizar):
// - Sin factura ingresada (azul): todavía no se solicitó el HES.
// - Pendiente de pago (amarillo): HES recibido, pero no pagaron.
// - Pagado (verde): ya pagaron.
export type InvoiceStatus = "SIN_FACTURA" | "PENDIENTE_PAGO" | "PAGADO";

export function invoiceStatus(invoice: {
  hesReceived: boolean;
  paid: boolean;
}): InvoiceStatus {
  if (invoice.paid) return "PAGADO";
  if (invoice.hesReceived) return "PENDIENTE_PAGO";
  return "SIN_FACTURA";
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  SIN_FACTURA: "Sin factura",
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADO: "Pagado",
};

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  SIN_FACTURA: "bg-blue-50 text-brand-blue",
  PENDIENTE_PAGO: "bg-amber-100 text-amber-700",
  PAGADO: "bg-green-100 text-green-700",
};
