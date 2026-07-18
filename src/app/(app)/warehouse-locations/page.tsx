"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import WarehouseLocationsPage from "@/components/masters/warehouse-locations/WarehouseLocationsPage";

export default function WarehouseLocationsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WarehouseLocationsPage />
    </Suspense>
  );
}
