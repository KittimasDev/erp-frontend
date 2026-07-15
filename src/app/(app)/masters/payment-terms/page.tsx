"use client";

import { Suspense } from "react";

import PageLoading from "@/components/common/PageLoading";

import PaymentTermsPage from "@/components/masters/payment-terms/PaymentTermsPage";

export default function MastersPaymentTermsRoutePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PaymentTermsPage />
    </Suspense>
  );
}
