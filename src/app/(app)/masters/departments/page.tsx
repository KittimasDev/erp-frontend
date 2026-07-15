"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import DepartmentsPage from "@/components/masters/departments/DepartmentsPage";

export default function MastersDepartmentsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DepartmentsPage />
    </Suspense>
  );
}
