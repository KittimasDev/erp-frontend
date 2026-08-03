"use client";

import { use } from "react";

import GoodsReceiptCreateFromPoPage from "@/components/goods-receipts/GoodsReceiptCreateFromPoPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <GoodsReceiptCreateFromPoPage
      purchaseOrderId={id}
      backHref="/purchase-orders/receive"
      pageTitle="รับของจากใบสั่งซื้อ"
    />
  );
}
