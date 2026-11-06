"use client";

import { useSearchParams } from "next/navigation";

import DispatchOrderCreatePage from "@/components/dispatch-orders/DispatchOrderCreatePage";
import { useT } from "@/lib/i18n/useT";

export default function Page() {
  const t = useT();
  const searchParams = useSearchParams();
  const salesOrderId = searchParams.get("salesOrderId") ?? "";

  if (!salesOrderId) {
    return (
      <div style={{ padding: 24, color: "#8a9199" }}>
        {t("กรุณาเข้าหน้านี้จากปุ่ม \"สร้างใบจ่ายสินค้า\" ในหน้ารายละเอียดใบสั่งขาย")}
      </div>
    );
  }

  return <DispatchOrderCreatePage salesOrderId={salesOrderId} />;
}
