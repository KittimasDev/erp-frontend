"use client";

import { useSearchParams } from "next/navigation";

import DispatchOrderCreatePage from "@/components/dispatch-orders/DispatchOrderCreatePage";

export default function Page() {
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get("salesOrderId") ?? "";

  if (!salesOrderId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        กรุณาเข้าหน้านี้จากปุ่ม &quot;สร้างใบจ่ายสินค้า&quot; ในหน้ารายละเอียดใบสั่งขาย
      </div>
    );
  }

  return <DispatchOrderCreatePage salesOrderId={salesOrderId} />;
}
