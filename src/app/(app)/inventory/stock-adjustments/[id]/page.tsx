"use client";

import { use } from "react";

import StockAdjustmentDetailPage from "@/components/stock-adjustments/StockAdjustmentDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockAdjustmentDetailPage id={id} />;
}
