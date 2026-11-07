"use client";

import { useSearchParams } from "next/navigation";

import { useT } from "@/lib/i18n/useT";
import PaymentRecordCreatePage from "@/components/payment-vouchers/PaymentRecordCreatePage";

export default function Page() {
  const t = useT();
  const searchParams = useSearchParams();
  const voucherId = searchParams.get("voucherId") ?? "";

  if (!voucherId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        {t("กรุณาเข้าหน้านี้จากปุ่ม \"บันทึกจ่ายเงิน\" ในตารางรายการรอบันทึกจ่ายเงิน")}
      </div>
    );
  }

  return <PaymentRecordCreatePage voucherId={voucherId} />;
}
