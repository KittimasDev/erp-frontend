"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import StockAdjustmentTypesPage from "@/components/masters/stock-adjustment-types/StockAdjustmentTypesPage";

export default function MastersStockAdjustmentTypesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <StockAdjustmentTypesPage />
    </Suspense>
  );
}
