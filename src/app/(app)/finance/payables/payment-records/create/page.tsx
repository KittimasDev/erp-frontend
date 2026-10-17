"use client";

import { useSearchParams } from "next/navigation";

import PaymentRecordCreatePage from "@/components/payment-vouchers/PaymentRecordCreatePage";

export default function Page() {
  const searchParams = useSearchParams();
  const voucherId = searchParams.get("voucherId") ?? "";

  if (!voucherId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        กรุณาเข้าหน้านี้จากปุ่ม &quot;บันทึกจ่ายเงิน&quot; ในตารางรายการรอบันทึกจ่ายเงิน
      </div>
    );
  }

  return <PaymentRecordCreatePage voucherId={voucherId} />;
}
