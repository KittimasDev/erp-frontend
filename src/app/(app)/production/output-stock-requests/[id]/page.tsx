"use client";

import { use } from "react";

import ProductionOutputApprovalDetailPage from "@/components/production-output/ProductionOutputApprovalDetailPage";
import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductionOutputStockRequestDetailRoutePage({
  params,
}: Props) {
  const { id } = use(params);
  return (
    <ProductionOutputFeatureGate>
      {/* ฝั่งการผลิตดูสถานะคำขอของตัวเองเท่านั้น — อนุมัติทำที่เมนูคลัง FG ที่เดียว */}
      <ProductionOutputApprovalDetailPage
        requestId={id}
        backHref="/production/output-stock-requests"
        backLabel="กลับรายการคำขอ"
        readOnly
      />
    </ProductionOutputFeatureGate>
  );
}
