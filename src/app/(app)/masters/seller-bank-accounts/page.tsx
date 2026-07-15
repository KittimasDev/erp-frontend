"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import SellerBankAccountsPage from "@/components/masters/seller-bank-accounts/SellerBankAccountsPage";

export default function MastersSellerBankAccountsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SellerBankAccountsPage />
    </Suspense>
  );
}
