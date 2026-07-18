"use client";

import { use } from "react";

import GoodsReceiptCreateFromPoPage from "@/components/goods-receipts/GoodsReceiptCreateFromPoPage";

export default function Page({
  params,
}: {
  params: Promise<{ purchaseOrderId: string }>;
}) {
  const { purchaseOrderId } = use(params);
  return (
    <GoodsReceiptCreateFromPoPage purchaseOrderId={purchaseOrderId} />
  );
}
