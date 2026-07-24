"use client";

import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";
import ProductionOutputPendingTicketsPage from "@/components/production-output/ProductionOutputPendingTicketsPage";

export default function ReceivingPendingProductionOutputPage() {
  return (
    <ProductionOutputFeatureGate>
      <ProductionOutputPendingTicketsPage />
    </ProductionOutputFeatureGate>
  );
}
