"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import PurchaseOrderCreateFromPrPage from "@/components/purchase-orders/PurchaseOrderCreateFromPrPage";
import { peekPurchaseOrderPrLineSelection } from "@/types/purchase-order-pr-line-selection";

function CreateFromPrs() {
  const searchParams = useSearchParams();
  /* ?ids=a,b,c — ตัดค่าว่างและใบซ้ำออก backend ปฏิเสธใบซ้ำอยู่แล้ว */
  const ids = Array.from(
    new Set(
      (searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
  const idsKey = ids.join(",");

  /*
    บรรทัดที่ติ๊กมาฝากไว้ใน sessionStorage (ยาวเกินกว่าจะใส่ใน URL)
    ต้องอ่านใน effect ไม่ใช่ตอน render ไม่งั้น server กับ client ได้คนละค่า
    และต้องรอให้อ่านเสร็จก่อนค่อย render ฟอร์ม ไม่งั้น effect ตั้งค่าเริ่มต้น
    ของฟอร์มจะรันรอบแรกด้วยค่า "ติ๊กทั้งหมด" แล้วค่อยถูกเขียนทับให้ผู้ใช้เห็นกระพริบ
  */
  const [preselected, setPreselected] = useState<string[] | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    /*
      sessionStorage อ่านตอน render ไม่ได้ (server ไม่มี) จึงต้องอ่านใน effect
      แล้วเก็บลง state — เป็นการดึงค่าจากระบบภายนอกครั้งเดียวตอน mount
      ไม่ใช่การคำนวณที่ควร derive ได้
    */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreselected(
      peekPurchaseOrderPrLineSelection(idsKey ? idsKey.split(",") : []),
    );
    setResolved(true);
  }, [idsKey]);

  if (!ids.length) {
    return (
      <div style={{ padding: 24 }}>
        ไม่ได้ระบุใบขอซื้อ — เลือกใบขอซื้อจากหน้ารายการใบสั่งซื้อก่อน
      </div>
    );
  }

  if (!resolved) {
    return <PageLoading />;
  }

  return (
    <PurchaseOrderCreateFromPrPage
      purchaseRequestIds={ids}
      preselectedPrItemIds={preselected ?? undefined}
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CreateFromPrs />
    </Suspense>
  );
}
