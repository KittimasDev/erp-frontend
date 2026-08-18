"use client";

import { Suspense } from "react";

import { ProductionRequestCreatePageWithSearchParams } from "@/components/production/ProductionRequestCreatePage";

export default function ProductionRequestCreateRoutePage() {
  return (
    <Suspense fallback={null}>
      <ProductionRequestCreatePageWithSearchParams />
    </Suspense>
  );
}
