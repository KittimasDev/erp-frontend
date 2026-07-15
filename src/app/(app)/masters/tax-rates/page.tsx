"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import TaxRatesPage from "@/components/masters/tax-rates/TaxRatesPage";

export default function MastersTaxRatesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TaxRatesPage />
    </Suspense>
  );
}
