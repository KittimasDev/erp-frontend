"use client";

import { useSearchParams } from "next/navigation";

import PaymentVoucherCreatePage from "@/components/payment-vouchers/PaymentVoucherCreatePage";

export default function Page() {
  const searchParams = useSearchParams();
  const queueItemId = searchParams.get("queueItemId") ?? "";

  if (!queueItemId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        กรุณาเข้าหน้านี้จากปุ่ม &quot;สร้างใบสำคัญจ่าย&quot; ในตารางรายการรอสร้างใบสำคัญจ่าย
      </div>
    );
  }

  return <PaymentVoucherCreatePage queueItemId={queueItemId} />;
}
