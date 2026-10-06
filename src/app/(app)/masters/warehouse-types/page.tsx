"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import WarehouseTypesPage from "@/components/masters/warehouse-types/WarehouseTypesPage";

export default function MastersWarehouseTypesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WarehouseTypesPage />
    </Suspense>
  );
}
