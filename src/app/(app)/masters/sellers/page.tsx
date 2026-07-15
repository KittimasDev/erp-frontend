"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import SellersPage from "@/components/masters/sellers/SellersPage";

export default function MastersSellersRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SellersPage />
    </Suspense>
  );
}
