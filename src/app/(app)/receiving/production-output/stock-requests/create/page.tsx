"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import PageLoading from "@/components/common/PageLoading";
import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";
import ProductionOutputStockRequestCreatePage from "@/components/production-output/ProductionOutputStockRequestCreatePage";

function CreatePageWithParams() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get("ticketId") ?? undefined;
  const ticketNo = searchParams.get("ticketNo") ?? undefined;
  const fromBatch =
    searchParams.get("fromBatch") === "1" ||
    searchParams.get("fromQueue") === "1";

  return (
    <ProductionOutputStockRequestCreatePage
      ticketId={ticketId}
      ticketNo={ticketNo}
      fromBatch={fromBatch}
    />
  );
}

export default function ReceivingProductionOutputStockRequestCreatePage() {
  return (
    <ProductionOutputFeatureGate>
      <Suspense fallback={<PageLoading />}>
        <CreatePageWithParams />
      </Suspense>
    </ProductionOutputFeatureGate>
  );
}
