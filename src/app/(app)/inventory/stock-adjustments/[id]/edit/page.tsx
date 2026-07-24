"use client";

import { use } from "react";

import StockAdjustmentFormPage from "@/components/stock-adjustments/StockAdjustmentFormPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StockAdjustmentFormPage mode="edit" id={id} />;
}
