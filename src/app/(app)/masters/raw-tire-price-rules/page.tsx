"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import RawTirePriceRulesPage from "@/components/masters/raw-tire-price-rules/RawTirePriceRulesPage";

export default function MastersRawTirePriceRulesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RawTirePriceRulesPage />
    </Suspense>
  );
}
