"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import ItemsPage from "@/components/masters/items/ItemsPage";

export default function MastersItemsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ItemsPage />
    </Suspense>
  );
}
