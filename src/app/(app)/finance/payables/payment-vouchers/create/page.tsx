"use client";

import { useSearchParams } from "next/navigation";

import { useT } from "@/lib/i18n/useT";
import PaymentVoucherCreatePage from "@/components/payment-vouchers/PaymentVoucherCreatePage";

export default function Page() {
  const t = useT();
  const searchParams = useSearchParams();
  const queueItemId = searchParams.get("queueItemId") ?? "";

  if (!queueItemId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        {t("กรุณาเข้าหน้านี้จากปุ่ม \"สร้างใบสำคัญจ่าย\" ในตารางรายการรอสร้างใบสำคัญจ่าย")}
      </div>
    );
  }

  return <PaymentVoucherCreatePage queueItemId={queueItemId} />;
}
