"use client";

import ProductionOutputFeatureGate from "@/components/production-output/ProductionOutputFeatureGate";
import ProductionOutputStockRequestsPage from "@/components/production-output/ProductionOutputStockRequestsPage";

export default function ReceivingProductionOutputStockRequestsPage() {
  return (
    <ProductionOutputFeatureGate>
      <ProductionOutputStockRequestsPage />
    </ProductionOutputFeatureGate>
  );
}
