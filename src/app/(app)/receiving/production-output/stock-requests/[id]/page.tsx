"use client";

import { use } from "react";

import ProductionOutputApprovalDetailPage from "@/components/production-output/ProductionOutputApprovalDetailPage";
import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ReceivingProductionOutputStockRequestDetailPage({
  params,
}: Props) {
  const { id } = use(params);
  return (
    <ProductionOutputFeatureGate>
      <ProductionOutputApprovalDetailPage
        requestId={id}
        backHref="/receiving/production-output/stock-requests"
        backLabel="กลับรายการคำขอ"
      />
    </ProductionOutputFeatureGate>
  );
}
