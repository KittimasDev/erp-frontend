"use client";

import { use } from "react";

import GoodsReceiptEditPage from "@/components/goods-receipts/GoodsReceiptEditPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GoodsReceiptEditPage id={id} />;
}
