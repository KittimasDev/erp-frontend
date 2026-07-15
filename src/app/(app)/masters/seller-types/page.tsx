"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import SellerTypesPage from "@/components/masters/seller-types/SellerTypesPage";

export default function MastersSellerTypesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SellerTypesPage />
    </Suspense>
  );
}
