"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import CompanyProfilePage from "@/components/masters/company-profile/CompanyProfilePage";

export default function MastersCompanyProfileRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CompanyProfilePage />
    </Suspense>
  );
}
