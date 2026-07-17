"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import WeighbridgeDashboardPage from "@/components/weighbridge/WeighbridgeDashboardPage";

export default function ReceivingRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WeighbridgeDashboardPage />
    </Suspense>
  );
}
