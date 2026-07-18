"use client";

import { use } from "react";

import ProductionOutputApprovalDetailPage from "@/components/production-output/ProductionOutputApprovalDetailPage";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ReceivingProductionOutputStockRequestDetailPage({
  params,
}: Props) {
  const { id } = use(params);
  return (
    <ProductionOutputApprovalDetailPage
      requestId={id}
      backHref="/receiving/production-output/stock-requests"
      backLabel="กลับรายการคำขอ"
    />
  );
}
