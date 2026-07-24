"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import CustomersPage from "@/components/masters/customers/CustomersPage";

export default function CustomersRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CustomersPage />
    </Suspense>
  );
}
