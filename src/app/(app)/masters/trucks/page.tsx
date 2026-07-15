"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import TrucksPage from "@/components/masters/trucks/TrucksPage";

export default function MastersTrucksRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TrucksPage />
    </Suspense>
  );
}
