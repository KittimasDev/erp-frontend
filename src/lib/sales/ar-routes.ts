/**
 * เส้นทางหน้าใบตั้งลูกหนี้ (AR ฝั่งขาย) — อยู่ใต้เมนู การเงิน › การรับเงิน
 * ข้อมูลยังเป็นตาราง sales_invoices เดิม (API /api/sales-invoices ไม่เปลี่ยน)
 * เส้นทางเดิม /sales-invoices* redirect มาที่นี่
 */
export const AR_BASE = "/finance/receivables/ar-invoices";

export const arRoutes = {
  list: AR_BASE,
  pending: `${AR_BASE}/pending`,
  detail: (id: string) => `${AR_BASE}/${id}`,
  edit: (id: string) => `${AR_BASE}/${id}/edit`,
  createFromDelivery: (deliveryOrderId: string) =>
    `${AR_BASE}/create-from-delivery/${deliveryOrderId}`,
};

export const AR_DEBIT_BASE = "/finance/receivables/debit-notes";

export const AR_BILLING_BASE = "/finance/receivables/billing-notes";

export const arBillingRoutes = {
  list: AR_BILLING_BASE,
  create: `${AR_BILLING_BASE}/create`,
  detail: (id: string) => `${AR_BILLING_BASE}/${id}`,
  edit: (id: string) => `${AR_BILLING_BASE}/${id}/edit`,
};

export const TAX_INVOICE_BASE = "/finance/receivables/tax-invoices";

export const taxInvoiceRoutes = {
  list: TAX_INVOICE_BASE,
  detail: (id: string) => `${TAX_INVOICE_BASE}/${id}`,
};

export const AR_RECEIPT_BASE = "/finance/receivables/payment-receipts";

export const arReceiptRoutes = {
  list: AR_RECEIPT_BASE,
  create: `${AR_RECEIPT_BASE}/create`,
  detail: (id: string) => `${AR_RECEIPT_BASE}/${id}`,
  /** หน้าใบเสร็จรับเงิน (มุมมองอ่านอย่างเดียว) และประวัติรับชำระ */
  receipts: "/finance/receivables/receipts",
  history: "/finance/receivables/payment-history",
};
