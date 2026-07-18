"use client";

import { use } from "react";

import GoodsReceiptDetailPage from "@/components/goods-receipts/GoodsReceiptDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GoodsReceiptDetailPage id={id} />;
}
