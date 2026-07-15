"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import TireClassificationsPage from "@/components/masters/tire-classifications/TireClassificationsPage";

export default function MastersTireClassificationsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TireClassificationsPage />
    </Suspense>
  );
}
