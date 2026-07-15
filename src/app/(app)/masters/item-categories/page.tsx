"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import ItemCategoriesPage from "@/components/masters/item-categories/ItemCategoriesPage";

export default function MastersItemCategoriesRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ItemCategoriesPage />
    </Suspense>
  );
}
