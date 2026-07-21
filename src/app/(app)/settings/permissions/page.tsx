"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";
import PermissionMatrixPage from "@/components/permissions/PermissionMatrixPage";

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PermissionMatrixPage />
    </Suspense>
  );
}
