"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import PurchaseRequestTypesPage from "@/components/masters/purchase-request-types/PurchaseRequestTypesPage";

export default function MastersPurchaseRequestTypesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PurchaseRequestTypesPage />
    </Suspense>
  );
}
