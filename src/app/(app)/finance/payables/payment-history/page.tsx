"use client";

import { useT } from "@/lib/i18n/useT";
import PurchasePaymentsListPage from "@/components/purchase-payments/PurchasePaymentsListPage";

export default function Page() {
  const t = useT();
  return (
    <PurchasePaymentsListPage
      basePath="/finance/payables/payment-history"
      secondaryHref="/finance/payables/payment-vouchers"
      secondaryLabel={t("ใบสำคัญจ่าย")}
    />
  );
}
