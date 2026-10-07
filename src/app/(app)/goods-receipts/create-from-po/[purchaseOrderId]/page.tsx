"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";

import GoodsReceiptCreateFromPoPage from "@/components/goods-receipts/GoodsReceiptCreateFromPoPage";

export default function Page({
  params,
}: {
  params: Promise<{ purchaseOrderId: string }>;
}) {
  const { purchaseOrderId } = use(params);
  const searchParams = useSearchParams();
  return (
    <GoodsReceiptCreateFromPoPage
      purchaseOrderId={purchaseOrderId}
      backHref={`/purchase-orders/${purchaseOrderId}`}
      pageTitle="รับของจากใบสั่งซื้อ"
      initialScheduleId={searchParams.get("scheduleId") ?? undefined}
    />
  );
}
