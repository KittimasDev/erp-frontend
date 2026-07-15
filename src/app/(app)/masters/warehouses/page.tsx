"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import WarehousesPage from "@/components/masters/warehouses/WarehousesPage";

export default function MastersWarehousesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WarehousesPage />
    </Suspense>
  );
}
