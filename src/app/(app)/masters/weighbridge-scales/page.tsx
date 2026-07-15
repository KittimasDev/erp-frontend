"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import WeighbridgeScalesPage from "@/components/masters/weighbridge-scales/WeighbridgeScalesPage";

export default function MastersWeighbridgeScalesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WeighbridgeScalesPage />
    </Suspense>
  );
}
