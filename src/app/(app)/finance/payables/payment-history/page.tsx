"use client";

import PurchasePaymentsListPage from "@/components/purchase-payments/PurchasePaymentsListPage";

export default function Page() {
  return (
    <PurchasePaymentsListPage
      basePath="/finance/payables/payment-history"
      secondaryHref="/finance/payables/payment-vouchers"
      secondaryLabel="ใบสำคัญจ่าย"
    />
  );
}
