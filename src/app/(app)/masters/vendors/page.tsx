"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import VendorsPage from "@/components/masters/vendors/VendorsPage";

export default function MastersVendorsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VendorsPage />
    </Suspense>
  );
}
